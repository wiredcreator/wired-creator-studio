import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Task from '@/models/Task';
import UserXP from '@/models/UserXP';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/students — Aggregated student list for admin dashboard
export async function GET() {
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

    // Fetch all students
    const students = await User.find({ role: 'student' })
      .select('name email createdAt onboardingCompleted personalBaselineCompleted riskFlags')
      .sort({ createdAt: -1 })
      .lean();

    if (students.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const studentIds = students.map((s) => s._id);

    // Batch fetch XP data for all students
    const xpRecords = await UserXP.find({ userId: { $in: studentIds } })
      .select('userId lifetimeXP lastActiveDate currentStreak')
      .lean();

    const xpMap = new Map(
      xpRecords.map((xp) => [xp.userId.toString(), xp])
    );

    // Batch aggregate task stats for all students
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalTaskStats, todayTaskStats, stuckTasks] = await Promise.all([
      Task.aggregate([
        { $match: { userId: { $in: studentIds }, deletedAt: { $exists: false } } },
        {
          $group: {
            _id: '$userId',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
      ]),
      Task.aggregate([
        {
          $match: {
            userId: { $in: studentIds },
            deletedAt: { $exists: false },
            dueDate: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: '$userId',
            todayTotal: { $sum: 1 },
            todayCompleted: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            pendingReviews: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$type', ['submit_content', 'review_script']] },
                      { $eq: ['$status', 'pending'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Task.aggregate([
        {
          $match: {
            userId: { $in: studentIds },
            deletedAt: { $exists: false },
            stuck: true,
          },
        },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);

    const totalMap = new Map(
      totalTaskStats.map((s: { _id: string; total: number; completed: number }) => [
        s._id.toString(),
        s,
      ])
    );
    const todayMap = new Map(
      todayTaskStats.map((s: { _id: string; todayTotal: number; todayCompleted: number; pendingReviews: number }) => [
        s._id.toString(),
        s,
      ])
    );
    const stuckMap = new Map(
      stuckTasks.map((s: { _id: string; count: number }) => [
        s._id.toString(),
        s.count,
      ])
    );

    // Assemble enriched student list
    let globalTasksDueToday = 0;
    let globalPendingReviews = 0;
    let globalStuckCount = 0;

    const enrichedStudents = students.map((student) => {
      const id = student._id.toString();
      const xp = xpMap.get(id);
      const total = totalMap.get(id);
      const todayStats = todayMap.get(id);
      const stuck = stuckMap.get(id) || 0;

      globalTasksDueToday += todayStats?.todayTotal || 0;
      globalPendingReviews += todayStats?.pendingReviews || 0;
      globalStuckCount += stuck;

      return {
        _id: id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt,
        onboardingCompleted: student.onboardingCompleted,
        personalBaselineCompleted: student.personalBaselineCompleted,
        riskFlags: student.riskFlags || [],
        lifetimeXP: xp?.lifetimeXP || 0,
        currentStreak: xp?.currentStreak || 0,
        lastActiveDate: xp?.lastActiveDate || null,
        totalTasks: total?.total || 0,
        completedTasks: total?.completed || 0,
        todayTasks: todayStats?.todayTotal || 0,
        todayCompleted: todayStats?.todayCompleted || 0,
        stuckTasks: stuck,
      };
    });

    return NextResponse.json({
      students: enrichedStudents,
      stats: {
        activeStudents: students.length,
        tasksDueToday: globalTasksDueToday,
        pendingReviews: globalPendingReviews,
        stuckStudents: globalStuckCount,
      },
    });
  } catch (error) {
    console.error('Error fetching admin students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
