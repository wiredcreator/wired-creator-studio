import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User';

// ---- Types ----

export type NotificationType =
  | 'task_assigned'
  | 'comment_reply'
  | 'quest_available'
  | 'xp_earned'
  | 'system'
  | 'task_stuck'
  | 'extension_request';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

// ---- Admin cache ----

let cachedAdminIds: string[] | null = null;
let adminCacheExpiry = 0;
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns an array of admin user IDs, cached for 5 minutes.
 * Never throws; returns an empty array on failure.
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    if (cachedAdminIds && Date.now() < adminCacheExpiry) {
      return cachedAdminIds;
    }
    await dbConnect();
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    cachedAdminIds = admins.map((a) => a._id.toString());
    adminCacheExpiry = Date.now() + ADMIN_CACHE_TTL_MS;
    return cachedAdminIds;
  } catch (err) {
    console.error('[Notification] Failed to fetch admin user IDs:', err);
    return cachedAdminIds ?? [];
  }
}

// ---- Core functions ----

/**
 * Create a single notification. Fire-and-forget safe: never throws,
 * logs errors internally. Can be awaited or called without await.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    await dbConnect();
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedId: input.relatedId,
      relatedType: input.relatedType,
    });
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err);
  }
}

/**
 * Create multiple notifications in a single batch insert.
 * Fire-and-forget safe: never throws, logs errors internally.
 */
export async function createNotifications(inputs: NotificationInput[]): Promise<void> {
  if (!inputs || inputs.length === 0) return;
  try {
    await dbConnect();
    await Notification.insertMany(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedId: input.relatedId,
        relatedType: input.relatedType,
      }))
    );
  } catch (err) {
    console.error('[Notification] Failed to create batch notifications:', err);
  }
}

// ---- Convenience helpers ----

/**
 * Notify all admins (and optionally an additional user like the task assigner).
 * Excludes a given user ID (typically the user who triggered the action).
 */
export async function notifyAdmins(
  opts: {
    type: NotificationType;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    excludeUserId?: string;
    alsoNotify?: string[];
  }
): Promise<void> {
  try {
    const adminIds = await getAdminUserIds();
    const recipientSet = new Set(adminIds);
    if (opts.alsoNotify) {
      for (const id of opts.alsoNotify) {
        if (id) recipientSet.add(id);
      }
    }
    if (opts.excludeUserId) {
      recipientSet.delete(opts.excludeUserId);
    }
    if (recipientSet.size === 0) return;

    await createNotifications(
      [...recipientSet].map((uid) => ({
        userId: uid,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        relatedId: opts.relatedId,
        relatedType: opts.relatedType,
      }))
    );
  } catch (err) {
    console.error('[Notification] Failed to notify admins:', err);
  }
}
