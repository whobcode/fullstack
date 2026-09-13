/**
 * Ability purchasing rules and the non-combat effects utility abilities grant.
 *
 * Abilities come in two kinds:
 *   - `equipment` feeds the battle maths (best attack/defense per category,
 *     multiplied by usable clan members).
 *   - `utility` never touches battle. It is bought for its own effect, like
 *     the Stamina Stone's +5 max stamina and +5% regeneration per copy.
 *
 * Repeat purchases are limited two ways. `max_quantity` caps the stack, and
 * `level_step` pushes each additional copy further out: the required level is
 * `level_requirement + level_step * copies_owned`. For the Stamina Stone that
 * is 25, 30, 35 … 70 for the tenth and last one.
 */

export interface AbilityRow {
  id: string;
  name: string;
  kind: string;
  cost: number;
  level_requirement: number;
  max_quantity: number;
  level_step: number;
  stamina_bonus: number;
  stamina_regen_pct: number;
  /** 'atk' | 'def' | 'hp' — which stat this variant favours. */
  focus: string;
  /** Groups the three focus variants that share a cost and level. */
  family: string | null;
  hp_value: number;
  hp_pct: number;
  spd_value: number;
  sellback_pct: number;
}

/** Level a character needs to buy their next copy of an ability. */
export function requiredLevelFor(ability: Pick<AbilityRow, 'level_requirement' | 'level_step'>, owned: number): number {
  return ability.level_requirement + ability.level_step * owned;
}

export interface PurchaseCheck {
  ok: boolean;
  error?: string;
  owned: number;
  required_level: number;
}

/** Whether this character may buy one more copy right now. */
export function canPurchase(ability: AbilityRow, owned: number, level: number, currency: number): PurchaseCheck {
  const required = requiredLevelFor(ability, owned);

  if (owned >= ability.max_quantity) {
    return {
      ok: false,
      error: `You already hold the maximum of ${ability.max_quantity} ${ability.name}.`,
      owned,
      required_level: required,
    };
  }

  if (level < required) {
    const next = owned === 0 ? '' : ` Each copy needs ${ability.level_step} more levels than the last.`;
    return {
      ok: false,
      error: `${ability.name} #${owned + 1} needs level ${required}.${next}`,
      owned,
      required_level: required,
    };
  }

  if (currency < ability.cost) {
    return {
      ok: false,
      error: `${ability.name} costs ${ability.cost.toLocaleString()} and you are holding ${currency.toLocaleString()}.`,
      owned,
      required_level: required,
    };
  }

  return { ok: true, owned, required_level: required };
}

/**
 * Stamina regeneration bonus, as a percentage.
 *
 * Account-wide: utility abilities are shared by all of a player's characters,
 * so this sums across every character the owner has rather than just this one.
 *
 * Kept as one scalar subquery so callers that already read the character can
 * fold it into their existing SELECT rather than making a second round trip —
 * regeneration runs on every read and across every character in the cron.
 */
export const STAMINA_REGEN_PCT_SUBQUERY = `
  COALESCE((
    SELECT SUM(ca.quantity * a.stamina_regen_pct)
    FROM character_abilities ca
    JOIN abilities a ON a.id = ca.ability_id
    WHERE a.kind = 'utility'
      AND ca.character_id IN (
        SELECT c2.id FROM characters c2 WHERE c2.user_id = characters.user_id
      )
  ), 0)
`;

/**
 * Minutes between stamina ticks for a character.
 *
 * Base is one per `baseMinutes`; each percent shortens the interval, so +50%
 * means 1.5x the ticks, i.e. 3 min -> 2 min. Floored at 10 seconds so a
 * runaway bonus can never make the interval zero and divide by nothing.
 */
export function staminaRegenMinutes(baseMinutes: number, bonusPct: number): number {
  const multiplier = 1 + Math.max(0, bonusPct) / 100;
  return Math.max(1 / 6, baseMinutes / multiplier);
}

/**
 * Extra max stamina from owned utility abilities.
 *
 * Utilities are account-wide: a Stamina Stone bought by one character counts
 * for every character the player owns. Equipment and health abilities stay
 * per character — only this kind is shared.
 */
export const STAMINA_BONUS_SUBQUERY = `
  COALESCE((
    SELECT SUM(ca.quantity * a.stamina_bonus)
    FROM character_abilities ca
    JOIN abilities a ON a.id = ca.ability_id
    WHERE a.kind = 'utility'
      AND ca.character_id IN (
        SELECT c2.id FROM characters c2 WHERE c2.user_id = characters.user_id
      )
  ), 0)
`;

/**
 * Canonical max-health expression.
 *
 * Health abilities contribute two ways: `hp_value` is a flat addition to the
 * pool, `hp_pct` a percentage of it (the three endgame ones, so they keep
 * scaling). Both must be folded in wherever max_health is recomputed —
 * allocate, respec, purchase and sell — or one of those paths silently erases
 * bought abilities, the same trap the Stamina Stone hit.
 *
 * `baseHpParam` is the SQL for the class base HP (a bound `?` or a literal).
 */
export function maxHealthExpr(baseHpParam: string): string {
  return `
    CAST(
      (${baseHpParam} + health_skill_points * 100 + COALESCE((
        SELECT SUM(ca.quantity * a.hp_value)
        FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
        WHERE ca.character_id = characters.id AND a.kind = 'equipment'
      ), 0))
      * (1 + COALESCE((
        SELECT SUM(ca.quantity * a.hp_pct)
        FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
        WHERE ca.character_id = characters.id AND a.kind = 'equipment'
      ), 0) / 100.0)
    AS INTEGER)
  `;
}

/**
 * Flat speed from owned equipment. Not clan-multiplied — it is a battle stat,
 * not a weapon. Per character: only utility abilities are shared across an
 * account, and the kind filter keeps it that way.
 */
export const EQUIPMENT_SPEED_SUBQUERY = `
  COALESCE((
    SELECT SUM(ca.quantity * a.spd_value)
    FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
    WHERE ca.character_id = characters.id AND a.kind = 'equipment'
  ), 0)
`;

// ---------------------------------------------------------------------------
// Ability stat points
//
// An ability's attack_value and defense_value are counted as skill points in
// that stat rather than as equipment: +5 attack on an ability held x10 is 50
// points in ATK. They therefore stop being multiplied by clan size, because a
// stat point never was.
//
// Speed is deliberately excluded — it already adds flat to the stat, which is
// the behaviour converting would have produced, only at double the rate.
// Health is excluded too: every health ability is flat or percentage, and both
// modify the pool rather than granting points.
// ---------------------------------------------------------------------------

/** One stat point is this percentage of the class base value. */
export const PCT_PER_STAT_POINT = 10;

/** Stat gain from `points` points, against a class base value. */
export function statGainFromPoints(points: number, base: number): number {
  return Math.round((points * base * PCT_PER_STAT_POINT) / 100);
}

/** Attack/defence points a character's equipment grants, as one scalar each. */
export const ABILITY_ATTACK_POINTS_SUBQUERY = `
  COALESCE((
    SELECT SUM(ca.quantity * a.attack_value)
    FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
    WHERE ca.character_id = characters.id AND a.kind = 'equipment'
  ), 0)
`;

export const ABILITY_DEFENSE_POINTS_SUBQUERY = `
  COALESCE((
    SELECT SUM(ca.quantity * a.defense_value)
    FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
    WHERE ca.character_id = characters.id AND a.kind = 'equipment'
  ), 0)
`;
