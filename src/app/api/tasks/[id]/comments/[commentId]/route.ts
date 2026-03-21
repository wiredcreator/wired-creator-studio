import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// PUT /api/tasks/[id]/comments/[commentId] — Edit a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id, commentId } = await params;
    const invalidTaskId = validateObjectId(id);
    if (invalidTaskId) return invalidTaskId;
    const invalidCommentId = validateObjectId(commentId);
    if (invalidCommentId) return invalidCommentId;

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

    const comment = task.comments.id(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Only the comment author, coach, or admin can edit
    if (comment.userId.toString() !== user.id && user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized to edit this comment' },
        { status: 403 }
      );
    }

    comment.text = text;
    await task.save();

    // Re-fetch with populated comment user info
    const updated = await Task.findById(id)
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email')
      .lean();

    const updatedComment = updated?.comments.find(
      (c: any) => c._id.toString() === commentId
    );

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error editing comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]/comments/[commentId] — Delete a comment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id, commentId } = await params;
    const invalidTaskId = validateObjectId(id);
    if (invalidTaskId) return invalidTaskId;
    const invalidCommentId = validateObjectId(commentId);
    if (invalidCommentId) return invalidCommentId;

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Only the comment author, coach, or admin can delete
    if (comment.userId.toString() !== user.id && user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    task.comments.pull({ _id: commentId });
    await task.save();

    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
