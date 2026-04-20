import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Task from '@/models/Task';
import ContentIdea from '@/models/ContentIdea';
import Script from '@/models/Script';
import UserXP from '@/models/UserXP';
import { toLocalDateKey, getDayOfWeekInTimezone, getDatePartsInTimezone } from '@/lib/format-date';

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

/**
 * Compute the start and end date strings (YYYY-MM-DD) for a period in the user's timezone,
 * and return corresponding UTC Date boundaries for MongoDB queries.
 */
function getDateRange(period: Period, timezone: string): { start: Date; end: Date; startStr: string; endStr: string } {
  const now = new Date();
  const todayStr = toLocalDateKey(now, timezone);
  const { year, month } = getDatePartsInTimezone(now, timezone);

  let startStr: string;
  const endStr = todayStr;

  switch (period) {
    case 'week': {
      const currentDay = getDayOfWeekInTimezone(now, timezone); // 0=Sun
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const mondayDate = new Date(todayStr + 'T12:00:00Z');
      mondayDate.setDate(mondayDate.getDate() - diffToMonday);
      startStr = mondayDate.toISOString().split('T')[0];
      break;
    }
    case 'month': {
      startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      break;
    }
    case 'last30': {
      const startDate = new Date(todayStr + 'T12:00:00Z');
      startDate.setDate(startDate.getDate() - 29);
      startStr = startDate.toISOString().split('T')[0];
      break;
    }
    default: {
      const startDate = new Date(todayStr + 'T12:00:00Z');
      startDate.setDate(startDate.getDate() - 6);
      startStr = startDate.toISOString().split('T')[0];
    }
  }

  // Convert to UTC Date objects for MongoDB queries (generous range to capture timezone edges)
  const start = new Date(startStr + 'T00:00:00Z');
  start.setDate(start.getDate() - 1); // 1 day buffer for timezone offset
  const end = new Date(endStr + 'T23:59:59.999Z');
  end.setDate(end.getDate() + 1); // 1 day buffer

  return { start, end, startStr, endStr };
}

function getDayLabel(dateStr: string, period: Period): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (period === 'week') {
    const d = new Date(dateStr + 'T12:00:00Z');
    return dayNames[d.getDay()];
  }

  // For month and last30, show compact date
  const parts = dateStr.split('-');
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

function generateDateStrings(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startStr + 'T12:00:00Z');
  const endDate = new Date(endStr + 'T12:00:00Z');
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
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

    // Fetch user's timezone
    const userDoc = await User.findById(user.id).select('timezone').lean();
    const timezone = (userDoc?.timezone as string) || 'America/New_York';

    const { start, end, startStr, endStr } = getDateRange(period, timezone);

    const userId = user.id;

    // Fetch all data in parallel (using buffered UTC range for queries)
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

    // Filter XP history to the date range (using timezone-aware date keys)
    const xpEntries = (xpDoc?.xpHistory ?? []).filter((entry) => {
      const key = toLocalDateKey(entry.timestamp, timezone);
      return key >= startStr && key <= endStr;
    });

    // Build daily buckets using timezone-aware date strings
    const dateStrings = generateDateStrings(startStr, endStr);
    const buckets: Record<string, DailyActivity> = {};

    for (const dateStr of dateStrings) {
      buckets[dateStr] = {
        date: dateStr,
        label: getDayLabel(dateStr, period),
        tasks: 0,
        ideas: 0,
        scripts: 0,
        brainDumps: 0,
        xp: 0,
      };
    }

    // Fill tasks (convert timestamps to user's local date)
    for (const task of completedTasks) {
      if (task.completedAt) {
        const key = toLocalDateKey(task.completedAt, timezone);
        if (buckets[key]) buckets[key].tasks++;
      }
    }

    // Fill ideas
    for (const idea of createdIdeas) {
      const key = toLocalDateKey(idea.createdAt, timezone);
      if (buckets[key]) buckets[key].ideas++;
    }

    // Fill scripts
    for (const script of createdScripts) {
      const key = toLocalDateKey(script.createdAt, timezone);
      if (buckets[key]) buckets[key].scripts++;
    }

    // Fill brain dumps
    for (const dump of brainDumpIdeas) {
      const key = toLocalDateKey(dump.createdAt, timezone);
      if (buckets[key]) buckets[key].brainDumps++;
    }

    // Fill XP
    for (const entry of xpEntries) {
      const key = toLocalDateKey(entry.timestamp, timezone);
      if (buckets[key]) buckets[key].xp += entry.points;
    }

    // Build ordered daily array
    const daily = dateStrings.map((dateStr) => buckets[dateStr]);

    // Compute totals (re-count from bucketed data to ensure timezone-correct totals)
    const totals = {
      tasks: daily.reduce((sum, d) => sum + d.tasks, 0),
      ideas: daily.reduce((sum, d) => sum + d.ideas, 0),
      scripts: daily.reduce((sum, d) => sum + d.scripts, 0),
      brainDumps: daily.reduce((sum, d) => sum + d.brainDumps, 0),
      xp: daily.reduce((sum, d) => sum + d.xp, 0),
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
