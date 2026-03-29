import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can batch-create tasks' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { tasks } = await request.json();

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'tasks must be a non-empty array' },
        { status: 400 }
      );
    }

    if (tasks.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tasks per batch' },
        { status: 400 }
      );
    }

    // Validate required fields
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.title || !t.type || !t.userId || !t.dueDate || t.weekNumber == null || t.dayOfWeek == null) {
        return NextResponse.json(
          { error: `Task at index ${i} is missing required fields (title, type, userId, dueDate, weekNumber, dayOfWeek)` },
          { status: 400 }
        );
      }
    }

    const created = await Task.insertMany(
      tasks.map((t: Record<string, unknown>) => ({
        userId: t.userId,
        title: t.title,
        description: t.description || '',
        type: t.type,
        status: 'pending',
        dueDate: new Date(t.dueDate as string),
        assignedBy: user.id,
        weekNumber: t.weekNumber,
        dayOfWeek: t.dayOfWeek,
        order: t.order || 0,
        embeddedVideoUrl: t.videoUrl || undefined,
      }))
    );

    return NextResponse.json(
      { success: true, count: created.length, tasks: created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error batch creating tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
