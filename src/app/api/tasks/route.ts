import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { createNotification } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';

// GET /api/tasks — List tasks with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    // Admins can view tasks for any user via query param
    const queryUserId = request.nextUrl.searchParams.get('userId');
    const userId = user.role === 'admin' && queryUserId
      ? queryUserId
      : user.id;

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

    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedBy', 'name email')
        .populate('comments.userId', 'name email')
        .sort({ order: 1, dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(tasks, total, page, limit));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks — Create a new task (admin action)
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Only admins can create tasks
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create tasks' },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { userId, title, type, dueDate, weekNumber, dayOfWeek } = body;

    if (!userId || !title || !type || !dueDate || weekNumber === undefined || dayOfWeek === undefined) {
      return NextResponse.json(
        { error: 'userId, title, type, dueDate, weekNumber, and dayOfWeek are required' },
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
      assignedBy: user.id,
      linkedContentId: body.linkedContentId,
      embeddedVideoUrl: body.embeddedVideoUrl || '',
      weekNumber,
      dayOfWeek,
      order: body.order || 0,
    });

    // Fire-and-forget notification to the assigned student
    createNotification({
      userId,
      type: 'task_assigned',
      title: 'New task assigned',
      message: `You were assigned a new task: ${title}`,
      relatedId: task._id.toString(),
      relatedType: 'task',
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
