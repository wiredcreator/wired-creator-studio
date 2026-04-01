import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { notifyAdmins } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';
import { awardXP } from '@/lib/xp-service';

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

    // Ensure user owns the task or is an admin
    if (task.userId.toString() !== user.id && user.role !== 'admin') {
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
    if (body.linkedContentType !== undefined) task.linkedContentType = body.linkedContentType;
    if (body.linkedContentTitle !== undefined) task.linkedContentTitle = body.linkedContentTitle;
    if (body.weekNumber !== undefined) task.weekNumber = body.weekNumber;
    if (body.dayOfWeek !== undefined) task.dayOfWeek = body.dayOfWeek;
    if (body.order !== undefined) task.order = body.order;

    // Handle "I'm Stuck" flag
    if (body.stuck === true) {
      task.stuckAt = new Date();
      task.stuckBy = new mongoose.Types.ObjectId(user.id);
    }

    // Handle "Request more time" extension
    if (body.extensionDays !== undefined) {
      const days = Number(body.extensionDays);
      if (days > 0) {
        const currentDue = new Date(task.dueDate);
        currentDue.setDate(currentDue.getDate() + days);
        task.dueDate = currentDue;
        task.extensionRequested = {
          days,
          requestedAt: new Date(),
        };
      }
    }

    await task.save();

    // Fire-and-forget notifications to admins when a student flags stuck or requests more time
    if (body.stuck === true) {
      notifyAdmins({
        type: 'task_stuck',
        title: 'Student flagged a task as stuck',
        message: `${user.name} flagged a task as stuck: ${task.title}`,
        relatedId: task._id.toString(),
        relatedType: 'task',
        excludeUserId: user.id,
        alsoNotify: task.assignedBy ? [task.assignedBy.toString()] : [],
      });
    }

    if (body.extensionDays !== undefined && Number(body.extensionDays) > 0) {
      const days = Number(body.extensionDays);
      notifyAdmins({
        type: 'extension_request',
        title: 'Student requested more time',
        message: `${user.name} requested ${days} more day${days === 1 ? '' : 's'} on: ${task.title}`,
        relatedId: task._id.toString(),
        relatedType: 'task',
        excludeUserId: user.id,
        alsoNotify: task.assignedBy ? [task.assignedBy.toString()] : [],
      });
    }

    // Fire-and-forget XP award when task is completed
    if (body.status === 'completed') {
      awardXP(task.userId.toString(), 'complete_task', { taskId: id }).catch((err) =>
        console.error('[XP] Failed to award complete_task XP:', err)
      );
    }

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

    // Only admins can delete tasks
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete tasks' },
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
