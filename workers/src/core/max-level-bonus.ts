/**
 * The max-level bonus.
 *
 * Every character a player has at level 300 grants **+100% to ATK, HP and DEF
 * on every character they own** — including the level-300 characters
 * themselves. Two at 300 is +200%, so each of that player's characters fights
 * with three times its computed attack, health and defence.
 *
 * Speed is excluded. It already decides initiative and the multi-hit count, and
 * multiplying it would hand anyone with a level-300 character a permanent
 * five-hit first strike against everyone else.
 *
 * The bonus is account-wide and recomputed from the current roster rather than
 * stored as a number, so it appears the moment a character reaches 300 and
 * disappears if that character is deleted.
 *
 * It is capped at the character slot maximum: every slot filled with a
 * level-300 character is the ceiling, currently +700% (an 8x multiplier) across
 * 7 slots.
 */

/** Extra multiplier per level-300 character. 1.0 = +100%. */
export const BONUS_PER_MAX_LEVEL_CHARACTER = 1.0;

export const MAX_LEVEL_FOR_BONUS = 300;

/**
 * Ceiling on how many characters can count toward the bonus.
 *
 * A player cannot hold more characters than they have slots, so this is the
 * real ceiling: every slot filled with a level-300 character is the most the
 * bonus can ever be. Stated explicitly rather than left implicit so the cap
 * does not quietly move if slots are ever granted outside the normal flow.
 *
 * Must match TOTAL_SLOTS in workers/src/api/game.ts.
 */
export const MAX_QUALIFYING_CHARACTERS = 7;

/** The largest multiplier anyone can reach: all slots filled at level 300. */
export const MAX_MULTIPLIER =
  1 + BONUS_PER_MAX_LEVEL_CHARACTER * MAX_QUALIFYING_CHARACTERS;

/**
 * SQL multiplier for the owner's level-300 count, e.g. 3.0 with two at 300.
 * Correlates on `characters`, so the outer query must select from it.
 */
export const MAX_LEVEL_MULTIPLIER_SQL = `
  (1 + ${BONUS_PER_MAX_LEVEL_CHARACTER} * MIN(${MAX_QUALIFYING_CHARACTERS}, (
    SELECT COUNT(*) FROM characters mlc
    WHERE mlc.user_id = characters.user_id AND mlc.level >= ${MAX_LEVEL_FOR_BONUS}
  )))
`;

/** The same multiplier in TypeScript, for values computed outside SQL. */
export function maxLevelMultiplier(maxLevelCharacters: number): number {
  const qualifying = Math.min(MAX_QUALIFYING_CHARACTERS, Math.max(0, maxLevelCharacters));
  return 1 + BONUS_PER_MAX_LEVEL_CHARACTER * qualifying;
}

/**
 * Class base HP as SQL, so expressions that need it do not have to bind it.
 * Must match BASE_STATS in ./classes.
 */
export const BASE_HP_SQL = `
  CASE characters.class
    WHEN 'phoenix'  THEN 10000
    WHEN 'dphoenix' THEN 10000
    WHEN 'dragon'   THEN 10000
    WHEN 'ddragon'  THEN 10000
    WHEN 'kies'     THEN 15000
    ELSE 10000
  END
`;
