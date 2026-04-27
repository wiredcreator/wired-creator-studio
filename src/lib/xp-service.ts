import dbConnect from '@/lib/db';
import User from '@/models/User';
import UserXP, { IUserXP } from '@/models/UserXP';
import { getXPForAction } from '@/lib/xp-config';
import { createNotification } from '@/lib/notifications';
import { isSameDayInTimezone, isYesterdayInTimezone } from '@/lib/format-date';

/**
 * Award XP to a user for a specific action.
 * Handles streak logic:
 *   - If lastActiveDate is today: no streak change
 *   - If lastActiveDate is yesterday: increment currentStreak
 *   - If lastActiveDate is older or null: reset currentStreak to 1
 * Updates bestStreak if currentStreak exceeds it.
 *
 * @param pointsOverride - If provided, uses this value instead of looking up
 *                         the action in the config. Used for side quests where
 *                         the AI assigns a specific XP reward.
 */
export async function awardXP(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>,
  pointsOverride?: number
): Promise<IUserXP> {
  await dbConnect();

  const points = pointsOverride ?? await getXPForAction(action);
  const now = new Date();

  // Look up user's timezone for streak calculations
  const userDoc = await User.findById(userId).select('timezone').lean();
  const timezone = (userDoc?.timezone as string) || 'America/New_York';

  // Step 1: Atomically increment lifetimeXP and push to xpHistory.
  // Uses upsert + $setOnInsert for first-time creation.
  const userXP = await UserXP.findOneAndUpdate(
    { userId },
    {
      $inc: { lifetimeXP: points },
      $push: {
        xpHistory: {
          action,
          points,
          timestamp: now,
          metadata,
        },
      },
      $setOnInsert: {
        currentStreak: 0,
        bestStreak: 0,
        lastActiveDate: null,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Step 2: Compute streak updates from the returned document.
  // Streak logic is safe against concurrent calls because same-day calls
  // are no-ops, and cross-day races are extremely unlikely.
  let newStreak = userXP.currentStreak;

  if (userXP.lastActiveDate) {
    const lastActive = new Date(userXP.lastActiveDate);
    if (isSameDayInTimezone(lastActive, now, timezone)) {
      // Same day in user's timezone, no streak change
    } else if (isYesterdayInTimezone(lastActive, now, timezone)) {
      // Consecutive day in user's timezone, increment streak
      newStreak += 1;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }
  } else {
    // First ever action, start streak at 1
    newStreak = 1;
  }

  const newBestStreak = Math.max(newStreak, userXP.bestStreak);

  // Only issue a second update if streak or lastActiveDate changed
  if (
    newStreak !== userXP.currentStreak ||
    newBestStreak !== userXP.bestStreak ||
    !userXP.lastActiveDate ||
    !isSameDayInTimezone(new Date(userXP.lastActiveDate), now, timezone)
  ) {
    await UserXP.updateOne(
      { userId },
      {
        $set: {
          currentStreak: newStreak,
          bestStreak: newBestStreak,
          lastActiveDate: now,
        },
      }
    );
    // Update the in-memory document to reflect the streak changes
    userXP.currentStreak = newStreak;
    userXP.bestStreak = newBestStreak;
    userXP.lastActiveDate = now;
  }

  // Fire-and-forget XP earned notification
  const actionLabels: Record<string, string> = {
    complete_task: 'completing a task',
    complete_side_quest: 'completing a side quest',
    approve_script: 'generating a script',
    brain_dump: 'a brain dump session',
    generate_idea: 'generating an idea',
    voice_storm: 'a voice storm session',
  };
  const label = actionLabels[action] || action;
  createNotification({
    userId,
    type: 'xp_earned',
    title: `+${points} XP earned!`,
    message: `You earned ${points} XP for ${label}.`,
  });

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
