import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ContentIdea from '@/models/ContentIdea';
import Script from '@/models/Script';
import UserXP from '@/models/UserXP';

type Period = 'week' | 'month' | 'last30';

interface DailyActivity {
  date: string; // ISO date string (YYYY-MM-DD)
  label: string;
  tasks: number;
  ideas: number;
  scripts: number;
  brainDumps: number;
  xp: number;
}

interface ProgressResponse {
  period: Period;
  totals: {
    tasks: number;
    ideas: number;
    scripts: number;
    brainDumps: number;
    xp: number;
  };
  daily: DailyActivity[];
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case 'week': {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case 'last30': {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    }
    default:
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function getDayLabel(date: Date, period: Period): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (period === 'week') {
    return dayNames[date.getDay()];
  }

  // For month and last30, show compact date
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// GET /api/dashboard/progress?period=week|month|last30
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'week') as Period;
    const { start, end } = getDateRange(period);

    const userId = user.id;

    // Fetch all data in parallel
    const [completedTasks, createdIdeas, createdScripts, brainDumpIdeas, xpDoc] = await Promise.all([
      Task.find({
        userId,
        status: 'completed',
        completedAt: { $gte: start, $lte: end },
      }).select('completedAt').lean(),

      ContentIdea.find({
        userId,
        createdAt: { $gte: start, $lte: end },
      }).select('createdAt source').lean(),

      Script.find({
        userId,
        createdAt: { $gte: start, $lte: end },
      }).select('createdAt').lean(),

      ContentIdea.find({
        userId,
        source: 'brain_dump',
        createdAt: { $gte: start, $lte: end },
      }).select('createdAt').lean(),

      UserXP.findOne({ userId }).select('xpHistory').lean(),
    ]);

    // Filter XP history to the date range
    const xpEntries = (xpDoc?.xpHistory ?? []).filter((entry) => {
      const ts = new Date(entry.timestamp);
      return ts >= start && ts <= end;
    });

    // Build daily buckets
    const dates = generateDateRange(start, end);
    const buckets: Record<string, DailyActivity> = {};

    for (const date of dates) {
      const key = toDateKey(date);
      buckets[key] = {
        date: key,
        label: getDayLabel(date, period),
        tasks: 0,
        ideas: 0,
        scripts: 0,
        brainDumps: 0,
        xp: 0,
      };
    }

    // Fill tasks
    for (const task of completedTasks) {
      if (task.completedAt) {
        const key = toDateKey(new Date(task.completedAt));
        if (buckets[key]) buckets[key].tasks++;
      }
    }

    // Fill ideas (excluding brain dumps to avoid double-counting)
    for (const idea of createdIdeas) {
      const key = toDateKey(new Date(idea.createdAt));
      if (buckets[key]) buckets[key].ideas++;
    }

    // Fill scripts
    for (const script of createdScripts) {
      const key = toDateKey(new Date(script.createdAt));
      if (buckets[key]) buckets[key].scripts++;
    }

    // Fill brain dumps
    for (const dump of brainDumpIdeas) {
      const key = toDateKey(new Date(dump.createdAt));
      if (buckets[key]) buckets[key].brainDumps++;
    }

    // Fill XP
    for (const entry of xpEntries) {
      const key = toDateKey(new Date(entry.timestamp));
      if (buckets[key]) buckets[key].xp += entry.points;
    }

    // Build ordered daily array
    const daily = dates.map((date) => buckets[toDateKey(date)]);

    // Compute totals
    const totals = {
      tasks: completedTasks.length,
      ideas: createdIdeas.length,
      scripts: createdScripts.length,
      brainDumps: brainDumpIdeas.length,
      xp: xpEntries.reduce((sum, e) => sum + e.points, 0),
    };

    const response: ProgressResponse = { period, totals, daily };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
