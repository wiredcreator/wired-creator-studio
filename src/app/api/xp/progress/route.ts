import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import UserXP from '@/models/UserXP';
import { toLocalDateKey, getDatePartsInTimezone, getDayOfWeekInTimezone } from '@/lib/format-date';

interface ProgressEntry {
  label: string;
  points: number;
}

// GET /api/xp/progress?period=week|month|ytd
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    // Fetch user's timezone for timezone-aware bucketing
    const userDoc = await User.findById(user.id).select('timezone').lean();
    const timezone = (userDoc?.timezone as string) || 'America/New_York';

    const xpDoc = await UserXP.findOne({ userId: user.id }).lean();
    const history = xpDoc?.xpHistory ?? [];

    let data: ProgressEntry[];

    switch (period) {
      case 'month':
        data = buildMonthData(history, timezone);
        break;
      case 'ytd':
        data = buildYTDData(history, timezone);
        break;
      case 'week':
      default:
        data = buildWeekData(history, timezone);
        break;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching XP progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Week view: Mon–Sun for the current week, points summed per day.
 * Uses the user's timezone to determine "today" and bucket entries by local day.
 */
function buildWeekData(
  history: { action: string; points: number; timestamp: Date }[],
  timezone: string
): ProgressEntry[] {
  const now = new Date();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get today's date string and day of week in the user's timezone
  const todayStr = toLocalDateKey(now, timezone);
  const currentDay = getDayOfWeekInTimezone(now, timezone); // 0=Sun, 1=Mon...
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

  // Compute Monday's date string by subtracting days
  const mondayDate = new Date(todayStr + 'T12:00:00Z');
  mondayDate.setDate(mondayDate.getDate() - diffToMonday);
  const mondayStr = mondayDate.toISOString().split('T')[0];

  // Compute Sunday's date string
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);
  const sundayStr = sundayDate.toISOString().split('T')[0];

  const buckets = new Array(7).fill(0);

  for (const entry of history) {
    // Convert entry timestamp to user's local date
    const entryDateStr = toLocalDateKey(entry.timestamp, timezone);
    if (entryDateStr >= mondayStr && entryDateStr <= sundayStr) {
      const entryDay = new Date(entryDateStr + 'T12:00:00Z').getDay();
      const dayIndex = entryDay === 0 ? 6 : entryDay - 1; // Mon=0 ... Sun=6
      buckets[dayIndex] += entry.points;
    }
  }

  return dayLabels.map((label, i) => ({ label, points: buckets[i] }));
}

/**
 * Month view: "Week 1"–"Week 4" for the current month, points summed per week.
 * Uses the user's timezone to determine current month and bucket entries.
 */
function buildMonthData(
  history: { action: string; points: number; timestamp: Date }[],
  timezone: string
): ProgressEntry[] {
  const now = new Date();
  const { year, month } = getDatePartsInTimezone(now, timezone);

  // Month boundaries as date strings (YYYY-MM-DD)
  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const buckets = [0, 0, 0, 0];

  for (const entry of history) {
    const entryDateStr = toLocalDateKey(entry.timestamp, timezone);
    if (entryDateStr >= monthStartStr && entryDateStr <= monthEndStr) {
      const day = parseInt(entryDateStr.split('-')[2], 10);
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
      buckets[weekIndex] += entry.points;
    }
  }

  return buckets.map((points, i) => ({ label: `Week ${i + 1}`, points }));
}

/**
 * YTD view: Jan through current month, points summed per month.
 * Uses the user's timezone to determine current year/month and bucket entries.
 */
function buildYTDData(
  history: { action: string; points: number; timestamp: Date }[],
  timezone: string
): ProgressEntry[] {
  const now = new Date();
  const { year, month: currentMonth } = getDatePartsInTimezone(now, timezone);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const buckets = new Array(currentMonth + 1).fill(0);

  for (const entry of history) {
    const parts = getDatePartsInTimezone(entry.timestamp, timezone);
    if (parts.year === year && parts.month <= currentMonth) {
      buckets[parts.month] += entry.points;
    }
  }

  return buckets.map((points, i) => ({ label: monthNames[i], points }));
}
