import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getUserXP, awardXP } from '@/lib/xp-service';

// GET /api/xp — Get current user's XP data
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const xpData = await getUserXP(user.id);

    if (!xpData) {
      return NextResponse.json({
        lifetimeXP: 0,
        currentStreak: 0,
        bestStreak: 0,
      });
    }

    return NextResponse.json({
      lifetimeXP: xpData.lifetimeXP,
      currentStreak: xpData.currentStreak,
      bestStreak: xpData.bestStreak,
    });
  } catch (error) {
    console.error('Error fetching XP data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/xp — Admin-only manual XP award
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Only admins can manually award XP
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can manually award XP' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action, metadata } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 }
      );
    }

    const xpData = await awardXP(userId, action, metadata);

    return NextResponse.json({
      lifetimeXP: xpData.lifetimeXP,
      currentStreak: xpData.currentStreak,
      bestStreak: xpData.bestStreak,
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
