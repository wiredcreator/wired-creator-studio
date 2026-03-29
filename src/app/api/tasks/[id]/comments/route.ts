import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
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

    // Fire-and-forget notification to the other party on this task
    const notifyUserId = task.userId.toString() === user.id
      ? task.assignedBy?.toString()  // Student commented → notify admin
      : task.userId.toString();       // Admin commented → notify student
    if (notifyUserId && notifyUserId !== user.id) {
      Notification.create({
        userId: notifyUserId,
        type: 'comment_reply',
        title: `New comment on "${task.title}"`,
        message: text.length > 100 ? text.slice(0, 100) + '...' : text,
        relatedId: task._id.toString(),
        relatedType: 'task',
      }).catch(() => {});
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
