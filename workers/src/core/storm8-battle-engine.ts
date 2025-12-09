/**
 * Storm8-Inspired Battle Engine
 *
 * Implements the probabilistic multi-factor battle system from Vampires Live / Zombies Live
 *
 * Key mechanics:
 * - Stat scaling: Attack/Defense contribution = skill_points × player_level
 * - Equipment multiplied across usable clan members (5 × level)
 * - Probabilistic outcomes with variance (higher stats = better odds, not guaranteed)
 * - Health threshold protection (26 HP for normal attacks, lifted for hitlist)
 * - Currency stealing from unbanked funds
 */

export type CharacterBattleStats = {
  id: string;
  level: number;

  // Skill points (scaling multiplier)
  attack_skill_points: number;
  defense_skill_points: number;
  health_skill_points: number;

  // Current resources
  current_health: number;
  max_health: number;
  current_stamina: number;

  // Equipment power (will be multiplied by usable clan members)
  equipment_attack: number;
  equipment_defense: number;

  // Usable clan members (5 × level)
  usable_clan_members: number;

  // Economy
  unbanked_currency: number;
  banked_currency: number;
};

export type BattleResult = {
  attacker_won: boolean;
  damage_dealt: number;
  currency_stolen: number;
  defender_health_after: number;
  defender_killed: boolean;
  variance_applied: number; // For debugging/display
  attacker_effective_power: number;
  defender_effective_power: number;
};

export type BattleConfig = {
  variance_percentage: number; // Default: 15 (means ±15%)
  health_protection_threshold: number; // Default: 26
  currency_steal_percentage: number; // Default: 10 (10% of unbanked)
};

const DEFAULT_CONFIG: BattleConfig = {
  variance_percentage: 15,
  health_protection_threshold: 26,
  currency_steal_percentage: 10,
};

/**
 * Calculate total attack power using Storm8 formula:
 * Total Attack = (equipment_attack × usable_clan_members) + (attack_skill_points × level)
 */
export function calculateAttackPower(stats: CharacterBattleStats): number {
  const equipmentPower = stats.equipment_attack * stats.usable_clan_members;
  const skillPower = stats.attack_skill_points * stats.level;
  return equipmentPower + skillPower;
}

/**
 * Calculate total defense power using Storm8 formula:
 * Total Defense = (equipment_defense × usable_clan_members) + (defense_skill_points × level)
 */
export function calculateDefensePower(stats: CharacterBattleStats): number {
  const equipmentPower = stats.equipment_defense * stats.usable_clan_members;
  const skillPower = stats.defense_skill_points * stats.level;
  return equipmentPower + skillPower;
}

/**
 * Advanced deterministic PRNG using multiple hash chains
 * Combines MurmurHash3, xorshift128+, and chaos factors for near-impossible reverse engineering
 *
 * The algorithm:
 * 1. Seeds multiple hash chains with battle metadata
 * 2. Applies stat-based perturbations (making identical stats produce same results)
 * 3. Uses multiple mixing functions to obscure the relationship
 * 4. Generates numbers that appear probabilistic but are fully deterministic
 */
function seededRandom(seed: string): () => number {
  // Initialize multiple hash states using different primes
  let h1 = 0x9e3779b9; // Golden ratio prime
  let h2 = 0x85ebca6b; // Another large prime
  let h3 = 0xc2b2ae35; // Third independent prime

  // Seed initialization with chaos mixing
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 0x85ebca77);
    h2 = Math.imul(h2 ^ (char << 8), 0xc2b2ae3d);
    h3 = Math.imul(h3 ^ (char >> 4), 0x27d4eb2f);

    // Cross-contaminate states
    h1 ^= h2 >>> 13;
    h2 ^= h3 >>> 17;
    h3 ^= h1 >>> 11;
  }

  // Final avalanche mixing
  h1 = Math.imul(h1 ^ h1 >>> 16, 0x85ebca6b);
  h2 = Math.imul(h2 ^ h2 >>> 16, 0xc2b2ae35);
  h3 = Math.imul(h3 ^ h3 >>> 16, 0x9e3779b9);

  // Generator state (xorshift128+ style with triple state)
  let state0 = h1 >>> 0;
  let state1 = h2 >>> 0;
  let state2 = h3 >>> 0;

  return () => {
    // Triple xorshift with mixed rotation amounts
    let s0 = state0;
    let s1 = state1;
    let s2 = state2;

    // First transform
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;

    // Second transform with different shifts
    s2 ^= s2 << 19;
    s2 ^= s2 >>> 11;
    s2 ^= s1;
    s2 ^= s1 >>> 13;

    // Third transform mixing back
    s0 ^= s0 << 17;
    s0 ^= s0 >>> 21;
    s0 ^= s2;
    s0 ^= s2 >>> 7;

    // Update states
    state0 = s1 >>> 0;
    state1 = s2 >>> 0;
    state2 = s0 >>> 0;

    // Combine all three states with non-linear mixing
    const result = (s0 + s1 + s2) >>> 0;
    const mixed = Math.imul(result ^ (result >>> 16), 0x45d9f3b);
    const final = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);

    return (final >>> 0) / 4294967296;
  };
}

/**
 * Apply variance to a power value
 * Storm8 used randomness so higher stats improved odds but didn't guarantee victory
 */
function applyVariance(
  basePower: number,
  variancePercent: number,
  random: () => number
): { value: number; variance: number } {
  const varianceRange = basePower * (variancePercent / 100);
  const variance = (random() * 2 - 1) * varianceRange; // Random between -range and +range
  return {
    value: Math.max(0, basePower + variance),
    variance: variance,
  };
}

/**
 * Calculate currency stolen based on damage differential
 * Higher damage = more currency stolen
 */
function calculateCurrencyStolen(
  damageDealt: number,
  defenderUnbanked: number,
  stealPercentage: number
): number {
  if (damageDealt <= 0) return 0;

  // Base steal is a percentage of unbanked funds
  const baseSteal = Math.floor(defenderUnbanked * (stealPercentage / 100));

  // Bonus scaling: higher damage = slightly higher steal
  // Cap at 50% of unbanked to prevent total wipeout
  const damageMultiplier = Math.min(1.5, 1 + (damageDealt / 1000));
  const totalSteal = Math.floor(baseSteal * damageMultiplier);

  return Math.min(totalSteal, Math.floor(defenderUnbanked * 0.5));
}

/**
 * Main battle resolution function
 *
 * @param attacker - Attacker's battle stats
 * @param defender - Defender's battle stats
 * @param seed - Random seed for deterministic results
 * @param config - Battle configuration (optional)
 * @param isHitlistBattle - If true, ignores health protection threshold
 * @returns Battle result
 */
export function resolveBattle(
  attacker: CharacterBattleStats,
  defender: CharacterBattleStats,
  seed: string,
  config: Partial<BattleConfig> = {},
  isHitlistBattle: boolean = false
): BattleResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const random = seededRandom(seed);

  // Calculate base powers
  const attackerBasePower = calculateAttackPower(attacker);
  const defenderBasePower = calculateDefensePower(defender);

  // Apply variance (Storm8's "luck factor")
  const attackerWithVariance = applyVariance(attackerBasePower, finalConfig.variance_percentage, random);
  const defenderWithVariance = applyVariance(defenderBasePower, finalConfig.variance_percentage, random);

  // Determine outcome (probabilistic comparison)
  const powerDifferential = attackerWithVariance.value - defenderWithVariance.value;
  const damageDealt = Math.max(0, Math.floor(powerDifferential));

  // Check if defender is protected (only for normal battles)
  const defenderProtected = !isHitlistBattle &&
                           defender.current_health <= finalConfig.health_protection_threshold &&
                           defender.current_health > 0;

  if (defenderProtected) {
    // Defender escaped to safety
    return {
      attacker_won: false,
      damage_dealt: 0,
      currency_stolen: 0,
      defender_health_after: defender.current_health,
      defender_killed: false,
      variance_applied: attackerWithVariance.variance,
      attacker_effective_power: attackerWithVariance.value,
      defender_effective_power: defenderWithVariance.value,
    };
  }

  // Apply damage
  const defenderHealthAfter = Math.max(0, defender.current_health - damageDealt);
  const defenderKilled = defenderHealthAfter === 0;
  const attackerWon = damageDealt > 0;

  // Calculate currency stolen (only if attacker won)
  const currencyStolen = attackerWon
    ? calculateCurrencyStolen(damageDealt, defender.unbanked_currency, finalConfig.currency_steal_percentage)
    : 0;

  return {
    attacker_won: attackerWon,
    damage_dealt: damageDealt,
    currency_stolen: currencyStolen,
    defender_health_after: defenderHealthAfter,
    defender_killed: defenderKilled,
    variance_applied: attackerWithVariance.variance,
    attacker_effective_power: attackerWithVariance.value,
    defender_effective_power: defenderWithVariance.value,
  };
}

/**
 * Calculate maximum health based on skill points
 * Base: 100 HP + (10 × health_skill_points)
 */
export function calculateMaxHealth(healthSkillPoints: number): number {
  return 100 + (healthSkillPoints * 10);
}

/**
 * Calculate maximum energy based on skill points
 * Base: 20 + skill points
 */
export function calculateMaxEnergy(energySkillPoints: number): number {
  return 20 + energySkillPoints;
}

/**
 * Calculate maximum stamina based on skill points
 * Base: 5 + skill points
 */
export function calculateMaxStamina(staminaSkillPoints: number): number {
  return 5 + staminaSkillPoints;
}

/**
 * Determine clan member bracket based on total clan size
 * Returns the bracket number (4, 9, 14, 19, etc.)
 */
export function getClanBracket(totalClanMembers: number): number {
  const brackets = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99];

  for (const bracket of brackets) {
    if (totalClanMembers <= bracket) {
      return bracket;
    }
  }

  // High level brackets "merge together"
  return Math.ceil(totalClanMembers / 100) * 100;
}

/**
 * Check if two players can see/attack each other based on bracket
 */
export function areInSameBracket(clanSize1: number, clanSize2: number): boolean {
  return getClanBracket(clanSize1) === getClanBracket(clanSize2);
}

/**
 * Calculate usable clan members in battle
 * Storm8 formula: 5 × level
 */
export function calculateUsableClanMembers(level: number, totalClanMembers: number): number {
  const maxUsable = 5 * level;
  return Math.min(maxUsable, totalClanMembers);
}

/**
 * Calculate time-based resource regeneration
 *
 * @param lastRegenTime - ISO timestamp of last regeneration
 * @param currentAmount - Current resource amount
 * @param maxAmount - Maximum resource amount
 * @param regenRateMinutes - Minutes per point regeneration
 * @returns New amount and updated timestamp
 */
export function calculateRegeneration(
  lastRegenTime: string,
  currentAmount: number,
  maxAmount: number,
  regenRateMinutes: number
): { newAmount: number; newTimestamp: string } {
  const now = new Date();
  const lastRegen = new Date(lastRegenTime);
  const minutesPassed = (now.getTime() - lastRegen.getTime()) / (1000 * 60);

  const pointsRegened = Math.floor(minutesPassed / regenRateMinutes);
  const newAmount = Math.min(maxAmount, currentAmount + pointsRegened);

  // Update timestamp to account for used regeneration time
  const regeneratedMinutes = pointsRegened * regenRateMinutes;
  const newTimestamp = new Date(lastRegen.getTime() + regeneratedMinutes * 60 * 1000).toISOString();

  return {
    newAmount,
    newTimestamp,
  };
}
