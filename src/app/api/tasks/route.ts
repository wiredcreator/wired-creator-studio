import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';

// GET /api/tasks — List tasks with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const date = request.nextUrl.searchParams.get('date');
    const status = request.nextUrl.searchParams.get('status');
    const weekNumber = request.nextUrl.searchParams.get('weekNumber');

    // Build query filter
    const filter: Record<string, unknown> = { userId };

    if (date) {
      // Filter tasks for a specific date (start of day to end of day)
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (status) filter.status = status;
    if (weekNumber) filter.weekNumber = parseInt(weekNumber, 10);

    const tasks = await Task.find(filter)
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email')
      .sort({ order: 1, dueDate: 1 })
      .lean();

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks — Create a new task (coach action)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { userId, title, type, dueDate, assignedBy, weekNumber, dayOfWeek } = body;

    if (!userId || !title || !type || !dueDate || !assignedBy || weekNumber === undefined || dayOfWeek === undefined) {
      return NextResponse.json(
        { error: 'userId, title, type, dueDate, assignedBy, weekNumber, and dayOfWeek are required' },
        { status: 400 }
      );
    }

    const task = await Task.create({
      userId,
      title,
      description: body.description || '',
      type,
      status: body.status || 'pending',
      dueDate: new Date(dueDate),
      assignedBy,
      linkedContentId: body.linkedContentId,
      embeddedVideoUrl: body.embeddedVideoUrl || '',
      weekNumber,
      dayOfWeek,
      order: body.order || 0,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
