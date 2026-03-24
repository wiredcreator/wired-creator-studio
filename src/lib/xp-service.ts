import dbConnect from '@/lib/db';
import UserXP, { IUserXP } from '@/models/UserXP';
import { getXPForAction } from '@/lib/xp-config';

/**
 * Check if two dates are the same calendar day (UTC).
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Check if date `a` is the calendar day immediately before date `b` (UTC).
 */
function isYesterday(a: Date, b: Date): boolean {
  const yesterday = new Date(b);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(a, yesterday);
}

/**
 * Award XP to a user for a specific action.
 * Handles streak logic:
 *   - If lastActiveDate is today: no streak change
 *   - If lastActiveDate is yesterday: increment currentStreak
 *   - If lastActiveDate is older or null: reset currentStreak to 1
 * Updates bestStreak if currentStreak exceeds it.
 */
export async function awardXP(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<IUserXP> {
  await dbConnect();

  const points = getXPForAction(action);
  const now = new Date();

  // Find or create the UserXP document
  let userXP = await UserXP.findOne({ userId });

  if (!userXP) {
    userXP = new UserXP({
      userId,
      lifetimeXP: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      xpHistory: [],
    });
  }

  // Add XP points
  userXP.lifetimeXP += points;

  // Streak logic
  if (userXP.lastActiveDate) {
    const lastActive = new Date(userXP.lastActiveDate);
    if (isSameDay(lastActive, now)) {
      // Same day — no streak change
    } else if (isYesterday(lastActive, now)) {
      // Consecutive day — increment streak
      userXP.currentStreak += 1;
    } else {
      // Streak broken — reset to 1
      userXP.currentStreak = 1;
    }
  } else {
    // First ever action — start streak at 1
    userXP.currentStreak = 1;
  }

  // Update best streak
  if (userXP.currentStreak > userXP.bestStreak) {
    userXP.bestStreak = userXP.currentStreak;
  }

  // Update last active date
  userXP.lastActiveDate = now;

  // Push to history
  userXP.xpHistory.push({
    action,
    points,
    timestamp: now,
    metadata,
  });

  await userXP.save();

  return userXP;
}

/**
 * Get a user's XP data.
 * Returns null if no XP record exists yet.
 */
export async function getUserXP(userId: string): Promise<IUserXP | null> {
  await dbConnect();
  return UserXP.findOne({ userId }).lean();
}
