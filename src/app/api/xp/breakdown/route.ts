import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getUserXP } from '@/lib/xp-service';

export interface XPBreakdownEntry {
  action: string;
  label: string;
  totalXP: number;
  count: number;
  percentage: number;
}

const ACTION_LABELS: Record<string, string> = {
  complete_task: 'Tasks Completed',
  generate_idea: 'Ideas Generated',
  approve_script: 'Scripts Created',
  brain_dump: 'Brain Dumps',
  complete_side_quest: 'Side Quests',
  voice_storm: 'Voice Storms',
};

// GET /api/xp/breakdown
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const xpData = await getUserXP(user.id);

    if (!xpData || xpData.xpHistory.length === 0) {
      return NextResponse.json({ breakdown: [], totalXP: 0 });
    }

    // Aggregate XP by action type
    const aggregated = new Map<string, { totalXP: number; count: number }>();

    for (const entry of xpData.xpHistory) {
      const existing = aggregated.get(entry.action);
      if (existing) {
        existing.totalXP += entry.points;
        existing.count += 1;
      } else {
        aggregated.set(entry.action, { totalXP: entry.points, count: 1 });
      }
    }

    const totalXP = xpData.lifetimeXP || 0;

    const breakdown: XPBreakdownEntry[] = Array.from(aggregated.entries())
      .map(([action, data]) => ({
        action,
        label: ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        totalXP: data.totalXP,
        count: data.count,
        percentage: totalXP > 0 ? Math.round((data.totalXP / totalXP) * 100) : 0,
      }))
      .sort((a, b) => b.totalXP - a.totalXP);

    return NextResponse.json({ breakdown, totalXP });
  } catch (error) {
    console.error('Error fetching XP breakdown:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
