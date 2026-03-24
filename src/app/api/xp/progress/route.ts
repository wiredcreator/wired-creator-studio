import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import UserXP from '@/models/UserXP';

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

    const xpDoc = await UserXP.findOne({ userId: user.id }).lean();
    const history = xpDoc?.xpHistory ?? [];

    let data: ProgressEntry[];

    switch (period) {
      case 'month':
        data = buildMonthData(history);
        break;
      case 'ytd':
        data = buildYTDData(history);
        break;
      case 'week':
      default:
        data = buildWeekData(history);
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
 */
function buildWeekData(
  history: { action: string; points: number; timestamp: Date }[]
): ProgressEntry[] {
  const now = new Date();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Find Monday of the current week (ISO week starts Monday)
  const currentDay = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const buckets = new Array(7).fill(0);

  for (const entry of history) {
    const ts = new Date(entry.timestamp);
    if (ts >= monday && ts <= sunday) {
      const dayIndex = ts.getDay() === 0 ? 6 : ts.getDay() - 1; // Mon=0 ... Sun=6
      buckets[dayIndex] += entry.points;
    }
  }

  return dayLabels.map((label, i) => ({ label, points: buckets[i] }));
}

/**
 * Month view: "Week 1"–"Week 4" for the current month, points summed per week.
 */
function buildMonthData(
  history: { action: string; points: number; timestamp: Date }[]
): ProgressEntry[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const buckets = [0, 0, 0, 0];

  for (const entry of history) {
    const ts = new Date(entry.timestamp);
    if (ts >= monthStart && ts <= monthEnd) {
      // Week index: days 1-7 = W1, 8-14 = W2, 15-21 = W3, 22+ = W4
      const weekIndex = Math.min(Math.floor((ts.getDate() - 1) / 7), 3);
      buckets[weekIndex] += entry.points;
    }
  }

  return buckets.map((points, i) => ({ label: `Week ${i + 1}`, points }));
}

/**
 * YTD view: Jan through current month, points summed per month.
 */
function buildYTDData(
  history: { action: string; points: number; timestamp: Date }[]
): ProgressEntry[] {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const buckets = new Array(currentMonth + 1).fill(0);

  for (const entry of history) {
    const ts = new Date(entry.timestamp);
    if (ts.getFullYear() === year && ts.getMonth() <= currentMonth) {
      buckets[ts.getMonth()] += entry.points;
    }
  }

  return buckets.map((points, i) => ({ label: monthNames[i], points }));
}
