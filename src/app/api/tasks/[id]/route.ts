import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// PUT /api/tasks/[id] — Update a task
export async function PUT(
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

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Ensure user owns the task or is a coach/admin
    if (task.userId.toString() !== user.id && user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized to update this task' },
        { status: 403 }
      );
    }

    // Apply updates
    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.type !== undefined) task.type = body.type;
    if (body.status !== undefined) {
      task.status = body.status;
      // Auto-set completedAt when marking as completed
      if (body.status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      }
      // Clear completedAt if reverting from completed
      if (body.status !== 'completed') {
        task.completedAt = undefined;
      }
    }
    if (body.dueDate !== undefined) task.dueDate = new Date(body.dueDate);
    if (body.embeddedVideoUrl !== undefined) task.embeddedVideoUrl = body.embeddedVideoUrl;
    if (body.linkedContentId !== undefined) task.linkedContentId = body.linkedContentId;
    if (body.weekNumber !== undefined) task.weekNumber = body.weekNumber;
    if (body.dayOfWeek !== undefined) task.dayOfWeek = body.dayOfWeek;
    if (body.order !== undefined) task.order = body.order;

    await task.save();

    // Re-fetch with populated fields
    const updated = await Task.findById(id)
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email')
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] — Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Only coaches and admins can delete tasks
    if (user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only coaches and admins can delete tasks' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await (task as any).softDelete(user.id);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
