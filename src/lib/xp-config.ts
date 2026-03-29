import dbConnect from '@/lib/db';
import XPConfig, { IXPConfig, XP_DEFAULTS } from '@/models/XPConfig';

/**
 * In-memory cache for XP config to avoid hitting MongoDB on every XP award.
 * TTL: 5 minutes.
 */
let cachedConfig: {
  taskCompleted: number;
  newIdeaSaved: number;
  newScriptCreated: number;
  newBrainDump: number;
  sideQuestMin: number;
  sideQuestMax: number;
  voiceStorm: number;
} | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Map from action names used in the codebase to the XPConfig field names.
 */
const ACTION_TO_FIELD: Record<string, keyof XPConfigValues> = {
  complete_task: 'taskCompleted',
  generate_idea: 'newIdeaSaved',
  approve_script: 'newScriptCreated',
  brain_dump: 'newBrainDump',
  complete_side_quest: 'sideQuestMin', // side quests use per-quest xpReward; this is the fallback
  voice_storm: 'voiceStorm',
};

export interface XPConfigValues {
  taskCompleted: number;
  newIdeaSaved: number;
  newScriptCreated: number;
  newBrainDump: number;
  sideQuestMin: number;
  sideQuestMax: number;
  voiceStorm: number;
}

/**
 * Fetch the singleton XP config from MongoDB (or create it with defaults).
 * Results are cached in memory for 5 minutes.
 */
export async function getXPConfig(): Promise<XPConfigValues> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  await dbConnect();

  let doc: IXPConfig | null = await XPConfig.findOne();
  if (!doc) {
    doc = await XPConfig.create({ ...XP_DEFAULTS });
  }

  cachedConfig = {
    taskCompleted: doc.taskCompleted,
    newIdeaSaved: doc.newIdeaSaved,
    newScriptCreated: doc.newScriptCreated,
    newBrainDump: doc.newBrainDump,
    sideQuestMin: doc.sideQuestMin,
    sideQuestMax: doc.sideQuestMax,
    voiceStorm: doc.voiceStorm,
  };
  cacheTimestamp = now;
  return cachedConfig;
}

/** Invalidate the in-memory cache (called after admin updates). */
export function invalidateXPConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Returns the XP point value for a given action.
 * Reads from the cached MongoDB config.
 * Returns 0 for unknown actions or actions that should not award XP (e.g., create_task).
 */
export async function getXPForAction(action: string): Promise<number> {
  const field = ACTION_TO_FIELD[action];
  if (!field) return 0;

  const config = await getXPConfig();
  return config[field] ?? 0;
}

/**
 * Returns a random XP value for a side quest within the configured min/max range.
 * Used as a fallback when the AI doesn't assign an xpReward.
 */
export async function getSideQuestXP(): Promise<number> {
  const config = await getXPConfig();
  const min = config.sideQuestMin;
  const max = config.sideQuestMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
