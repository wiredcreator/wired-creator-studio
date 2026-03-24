/**
 * XP point values per action type.
 * Adjust values here to rebalance the gamification system.
 */
export const XP_ACTIONS: Record<string, number> = {
  generate_idea: 10,
  brain_dump: 15,
  create_task: 5,
  complete_task: 20,
  approve_script: 25,
  complete_side_quest: 15,
  voice_storm: 15,
};

/**
 * Returns the XP point value for a given action.
 * Returns 0 for unknown actions.
 */
export function getXPForAction(action: string): number {
  return XP_ACTIONS[action] ?? 0;
}
