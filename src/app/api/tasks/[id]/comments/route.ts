import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { createNotification, createNotifications } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// POST /api/tasks/[id]/comments — Add a comment to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    task.comments.push({
      userId: new Types.ObjectId(user.id),
      text,
      createdAt: new Date(),
    });

    await task.save();

    // Fire-and-forget notifications:
    // Notify the task owner, the task assigner, and all previous commenters
    // (excluding the person who just posted the comment)
    const recipientSet = new Set<string>();

    // Always include task owner and assigner
    recipientSet.add(task.userId.toString());
    if (task.assignedBy) {
      recipientSet.add(task.assignedBy.toString());
    }

    // Include all previous commenters in the thread
    for (const comment of task.comments) {
      recipientSet.add(comment.userId.toString());
    }

    // Remove the commenter themselves
    recipientSet.delete(user.id);

    if (recipientSet.size > 0) {
      const truncatedText = text.length > 100 ? text.slice(0, 100) + '...' : text;
      createNotifications(
        [...recipientSet].map((uid) => ({
          userId: uid,
          type: 'comment_reply' as const,
          title: `New comment on "${task.title}"`,
          message: truncatedText,
          relatedId: task._id.toString(),
          relatedType: 'task',
        }))
      );
    }

    // Re-fetch with populated comment user info
    const updated = await Task.findById(id)
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email')
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
