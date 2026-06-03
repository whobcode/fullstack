/**
 * Social → RPG progression bridge.
 * Grants XP / currency to a user's primary character for social engagement,
 * handling level-ups via the shared leveling rules.
 */
import { checkForLevelUp, MAX_LEVEL } from './leveling';

export interface ProgressReward { xp?: number; currency?: number; }
export interface ProgressResult { characterId: string; xp: number; level: number; leveledUp: boolean; pointsGained: number; currency: number; }

export async function awardProgress(
  db: D1Database,
  userId: string,
  reward: ProgressReward
): Promise<ProgressResult | null> {
  const ch = await db
    .prepare('SELECT id, level, xp, unspent_stat_points, unbanked_currency FROM characters WHERE user_id = ? ORDER BY slot_number LIMIT 1')
    .bind(userId)
    .first<{ id: string; level: number; xp: number; unspent_stat_points: number; unbanked_currency: number }>();
  if (!ch) return null;

  const addXp = Math.max(0, reward.xp ?? 0);
  const addCurrency = Math.max(0, reward.currency ?? 0);
  const newXp = ch.xp + addXp;

  let level = ch.level;
  let pointsGained = 0;
  if (level < MAX_LEVEL && addXp > 0) {
    const lvl = checkForLevelUp(ch.level, newXp);
    if (lvl) { level = lvl.newLevel; pointsGained = lvl.pointsGained; }
  }

  await db
    .prepare(`UPDATE characters
              SET xp = ?, level = ?, unspent_stat_points = unspent_stat_points + ?,
                  unbanked_currency = unbanked_currency + ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`)
    .bind(newXp, level, pointsGained, addCurrency, ch.id)
    .run();

  return {
    characterId: ch.id,
    xp: newXp,
    level,
    leveledUp: level > ch.level,
    pointsGained,
    currency: (ch.unbanked_currency ?? 0) + addCurrency,
  };
}

/** Reward amounts for each social action (tune freely). */
export const REWARDS = {
  post: { xp: 10, currency: 5 },
  comment: { xp: 5, currency: 2 },
  reactionReceived: { xp: 3, currency: 1 }, // to the post author when someone reacts
} as const;
