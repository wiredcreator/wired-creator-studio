import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Task from '@/models/Task';
import TaskTemplate from '@/models/TaskTemplate';
import { createNotifications } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * Get the Monday of the current week (start of week).
 */
function getCurrentMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    // Fetch student
    const student = await User.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const currentWeek = student.currentWeekNumber || 1;

    if (currentWeek >= 16) {
      return NextResponse.json(
        { error: 'Student is already at week 16 (maximum)' },
        { status: 400 }
      );
    }

    const newWeekNumber = currentWeek + 1;

    // Update student's week number
    student.currentWeekNumber = newWeekNumber;
    await student.save();

    // Fetch active templates for the new week
    const templates = await TaskTemplate.find({
      weekNumber: newWeekNumber,
      isActive: true,
    }).sort({ order: 1 }).lean();

    if (templates.length === 0) {
      return NextResponse.json({
        newWeekNumber,
        tasksCreated: 0,
        tasks: [],
        message: `Advanced to week ${newWeekNumber}, but no task templates are configured for this week.`,
      });
    }

    // Calculate due dates based on current Monday + dayOfWeek offset
    const monday = getCurrentMonday();

    const tasksToCreate = templates.map((tmpl) => ({
      userId: studentId,
      title: tmpl.title,
      description: tmpl.description || '',
      type: tmpl.type,
      status: 'pending' as const,
      dueDate: new Date(monday.getTime() + tmpl.dayOfWeek * 24 * 60 * 60 * 1000),
      assignedBy: user.id,
      weekNumber: newWeekNumber,
      dayOfWeek: tmpl.dayOfWeek,
      order: tmpl.order,
      embeddedVideoUrl: tmpl.embeddedVideoUrl || undefined,
    }));

    const created = await Task.insertMany(tasksToCreate);

    // Fire notifications for new tasks
    createNotifications(
      created.map((t) => ({
        userId: String(t.userId),
        type: 'task_assigned' as const,
        title: 'New task assigned',
        message: `Week ${newWeekNumber}: ${t.title}`,
        relatedId: t._id.toString(),
        relatedType: 'task',
      }))
    );

    return NextResponse.json({
      newWeekNumber,
      tasksCreated: created.length,
      tasks: created,
    });
  } catch (error) {
    console.error('Error advancing week:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
