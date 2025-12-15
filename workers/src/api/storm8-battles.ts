/**
 * Storm8 Battle System API Routes
 *
 * Implements:
 * - Skill point allocation
 * - Normal PvP attacks with stamina cost
 * - Hitlist bounty system
 * - Clan management
 * - Ability/equipment purchasing
 * - Mission system for PvE income
 * - Resource regeneration
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import {
  resolveBattle,
  calculateMaxHealth,
  calculateMaxEnergy,
  calculateMaxStamina,
  calculateUsableClanMembers,
  getClanBracket,
  areInSameBracket,
  calculateRegeneration,
  canAttackByLevel,
  getAttackXpMultiplier,
  getBaseAttackXp,
  getLevelBracket,
  type CharacterBattleStats,
} from '../core/storm8-battle-engine';
import { checkForLevelUp } from '../core/leveling';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

const storm8 = new Hono<App>();

// All routes require authentication
storm8.use('*', authMiddleware);

// ============================================================================
// SKILL ALLOCATION
// ============================================================================

const allocateSkillsSchema = z.object({
  attack: z.number().int().min(0).default(0),
  defense: z.number().int().min(0).default(0),
  health: z.number().int().min(0).default(0),
  energy: z.number().int().min(0).default(0),
  stamina: z.number().int().min(0).default(0),
});

storm8.post('/skills/allocate', zValidator('json', allocateSkillsSchema), async (c) => {
  const user = c.get('user');
  const allocation = c.req.valid('json');
  const db = c.env.DB;

  const totalAllocated = allocation.attack + allocation.defense + allocation.health + allocation.energy + allocation.stamina;

  if (totalAllocated === 0) {
    return c.json({ error: 'Must allocate at least 1 point' }, 400);
  }

  const char = await db
    .prepare('SELECT unspent_stat_points FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ unspent_stat_points: number }>();

  if (!char || totalAllocated > char.unspent_stat_points) {
    return c.json({ error: 'Insufficient unspent stat points' }, 400);
  }

  // Update skill points and recalculate max values
  await db
    .prepare(`
      UPDATE characters
      SET
        attack_skill_points = attack_skill_points + ?,
        defense_skill_points = defense_skill_points + ?,
        health_skill_points = health_skill_points + ?,
        energy_skill_points = energy_skill_points + ?,
        stamina_skill_points = stamina_skill_points + ?,
        unspent_stat_points = unspent_stat_points - ?,
        max_health = 100 + ((health_skill_points + ?) * 10),
        max_energy = 20 + (energy_skill_points + ?),
        max_stamina = 5 + (stamina_skill_points + ?)
      WHERE user_id = ?
    `)
    .bind(
      allocation.attack,
      allocation.defense,
      allocation.health,
      allocation.energy,
      allocation.stamina,
      totalAllocated,
      allocation.health,
      allocation.energy,
      allocation.stamina,
      user.id
    )
    .run();

  // Log the allocation
  const allocations = Object.entries(allocation)
    .filter(([_, points]) => points > 0)
    .map(([stat, points]) =>
      db.prepare('INSERT INTO skill_allocations (character_id, stat_type, points_allocated) VALUES ((SELECT id FROM characters WHERE user_id = ?), ?, ?)')
        .bind(user.id, stat, points)
    );

  if (allocations.length > 0) {
    await db.batch(allocations);
  }

  return c.json({ message: 'Skill points allocated successfully' });
});

// ============================================================================
// CLAN MANAGEMENT
// ============================================================================

storm8.get('/clan', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT id, level FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string; level: number }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  const members = await db
    .prepare('SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM clan_members WHERE character_id = ?')
    .bind(char.id)
    .first<{ total: number; active: number }>();

  const usable = calculateUsableClanMembers(char.level, members?.total || 0);
  const bracket = getClanBracket(members?.total || 0);

  return c.json({
    data: {
      total_members: members?.total || 0,
      active_members: members?.active || 0,
      usable_in_battle: usable,
      bracket: bracket,
      max_usable: 5 * char.level,
    },
  });
});

const recruitClanSchema = z.object({
  count: z.number().int().min(1).max(10).default(1),
});

storm8.post('/clan/recruit', zValidator('json', recruitClanSchema), async (c) => {
  const user = c.get('user');
  const { count } = c.req.valid('json');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT id FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  // Get current max index
  const maxIndex = await db
    .prepare('SELECT COALESCE(MAX(member_index), 0) as max_idx FROM clan_members WHERE character_id = ?')
    .bind(char.id)
    .first<{ max_idx: number }>();

  // Create new members
  const inserts = [];
  for (let i = 1; i <= count; i++) {
    const newIndex = (maxIndex?.max_idx || 0) + i;
    inserts.push(
      db.prepare('INSERT INTO clan_members (character_id, member_index) VALUES (?, ?)')
        .bind(char.id, newIndex)
    );
  }

  await db.batch(inserts);

  return c.json({ message: `Recruited ${count} clan member(s)` });
});

// ============================================================================
// ABILITIES/EQUIPMENT
// ============================================================================

storm8.get('/abilities', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  const char = await db
    .prepare('SELECT level FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ level: number }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  // Get available abilities for purchase (at or below character level)
  const abilities = await db
    .prepare('SELECT * FROM abilities WHERE level_requirement <= ? ORDER BY cost ASC')
    .bind(char.level)
    .all();

  return c.json({ data: abilities.results });
});

const purchaseAbilitySchema = z.object({
  ability_id: z.string(),
});

storm8.post('/abilities/purchase', zValidator('json', purchaseAbilitySchema), async (c) => {
  const user = c.get('user');
  const { ability_id } = c.req.valid('json');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT id, unbanked_currency, level FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string; unbanked_currency: number; level: number }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  const ability = await db
    .prepare('SELECT * FROM abilities WHERE id = ?')
    .bind(ability_id)
    .first<{ id: string; cost: number; level_requirement: number }>();

  if (!ability) {
    return c.json({ error: 'Ability not found' }, 404);
  }

  if (ability.level_requirement > char.level) {
    return c.json({ error: 'Level requirement not met' }, 400);
  }

  if (ability.cost > char.unbanked_currency) {
    return c.json({ error: 'Insufficient currency' }, 400);
  }

  // Purchase the ability
  await db.batch([
    db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
      .bind(ability.cost, char.id),
    db.prepare('INSERT INTO character_abilities (character_id, ability_id, quantity) VALUES (?, ?, 1) ON CONFLICT(character_id, ability_id) DO UPDATE SET quantity = quantity + 1')
      .bind(char.id, ability.id),
  ]);

  return c.json({ message: 'Ability purchased successfully' });
});

storm8.get('/abilities/owned', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const owned = await db
    .prepare(`
      SELECT a.*, ca.quantity
      FROM character_abilities ca
      JOIN abilities a ON ca.ability_id = a.id
      WHERE ca.character_id = (SELECT id FROM characters WHERE user_id = ?)
      ORDER BY a.category, a.attack_value DESC
    `)
    .bind(user.id)
    .all();

  return c.json({ data: owned.results });
});

// ============================================================================
// RESOURCE REGENERATION HELPER
// ============================================================================

async function applyResourceRegeneration(db: D1Database, characterId: string): Promise<void> {
  const char = await db
    .prepare(`
      SELECT
        current_energy, max_energy, last_energy_regen,
        current_stamina, max_stamina, last_stamina_regen
      FROM characters WHERE id = ?
    `)
    .bind(characterId)
    .first<{
      current_energy: number;
      max_energy: number;
      last_energy_regen: string;
      current_stamina: number;
      max_stamina: number;
      last_stamina_regen: string;
    }>();

  if (!char) return;

  // Energy: 1 point per 5 minutes
  const energyRegen = calculateRegeneration(
    char.last_energy_regen,
    char.current_energy,
    char.max_energy,
    5
  );

  // Stamina: 1 point per 3 minutes
  const staminaRegen = calculateRegeneration(
    char.last_stamina_regen,
    char.current_stamina,
    char.max_stamina,
    3
  );

  await db
    .prepare(`
      UPDATE characters
      SET
        current_energy = ?,
        last_energy_regen = ?,
        current_stamina = ?,
        last_stamina_regen = ?
      WHERE id = ?
    `)
    .bind(
      energyRegen.newAmount,
      energyRegen.newTimestamp,
      staminaRegen.newAmount,
      staminaRegen.newTimestamp,
      characterId
    )
    .run();
}

// ============================================================================
// BATTLE STATS HELPER
// ============================================================================

async function getCharacterBattleStats(db: D1Database, characterId: string): Promise<CharacterBattleStats | null> {
  const char = await db
    .prepare(`
      SELECT
        c.id, c.level,
        c.attack_skill_points, c.defense_skill_points, c.health_skill_points,
        c.current_health, c.max_health, c.current_stamina,
        c.unbanked_currency, c.banked_currency
      FROM characters c
      WHERE c.id = ?
    `)
    .bind(characterId)
    .first<{
      id: string;
      level: number;
      attack_skill_points: number;
      defense_skill_points: number;
      health_skill_points: number;
      current_health: number;
      max_health: number;
      current_stamina: number;
      unbanked_currency: number;
      banked_currency: number;
    }>();

  if (!char) return null;

  // Get total clan members
  const clanCount = await db
    .prepare('SELECT COUNT(*) as total FROM clan_members WHERE character_id = ?')
    .bind(characterId)
    .first<{ total: number }>();

  const usableClanMembers = calculateUsableClanMembers(char.level, clanCount?.total || 0);

  // Get top 3 attack abilities (one per category)
  const attackAbilities = await db
    .prepare(`
      SELECT DISTINCT ON (a.category) a.attack_value
      FROM character_abilities ca
      JOIN abilities a ON ca.ability_id = a.id
      WHERE ca.character_id = ?
      ORDER BY a.category, a.attack_value DESC
    `)
    .bind(characterId)
    .all();

  // Get top 3 defense abilities (one per category)
  const defenseAbilities = await db
    .prepare(`
      SELECT DISTINCT ON (a.category) a.defense_value
      FROM character_abilities ca
      JOIN abilities a ON ca.ability_id = a.id
      WHERE ca.character_id = ?
      ORDER BY a.category, a.defense_value DESC
    `)
    .bind(characterId)
    .all();

  const equipment_attack = (attackAbilities.results || []).reduce((sum: number, a: any) => sum + (a.attack_value || 0), 0);
  const equipment_defense = (defenseAbilities.results || []).reduce((sum: number, a: any) => sum + (a.defense_value || 0), 0);

  return {
    id: char.id,
    level: char.level,
    attack_skill_points: char.attack_skill_points,
    defense_skill_points: char.defense_skill_points,
    health_skill_points: char.health_skill_points,
    current_health: char.current_health,
    max_health: char.max_health,
    current_stamina: char.current_stamina,
    equipment_attack,
    equipment_defense,
    usable_clan_members: usableClanMembers,
    unbanked_currency: char.unbanked_currency,
    banked_currency: char.banked_currency,
  };
}

// ============================================================================
// NORMAL BATTLE (PvP Attack)
// ============================================================================

const attackPlayerSchema = z.object({
  defender_character_id: z.string(),
});

storm8.post('/attack', zValidator('json', attackPlayerSchema), async (c) => {
  const user = c.get('user');
  const { defender_character_id } = c.req.valid('json');
  const db = c.env.DB;

  // Get attacker character
  const attackerChar = await db
    .prepare('SELECT id FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string }>();

  if (!attackerChar) {
    return c.json({ error: 'Character not found' }, 404);
  }

  if (attackerChar.id === defender_character_id) {
    return c.json({ error: 'Cannot attack yourself' }, 400);
  }

  // Apply regeneration first
  await applyResourceRegeneration(db, attackerChar.id);

  // Get stats
  const attackerStats = await getCharacterBattleStats(db, attackerChar.id);
  const defenderStats = await getCharacterBattleStats(db, defender_character_id);

  if (!attackerStats || !defenderStats) {
    return c.json({ error: 'Character stats not found' }, 404);
  }

  // Check stamina
  if (attackerStats.current_stamina < 1) {
    return c.json({ error: 'Insufficient stamina' }, 400);
  }

  // Check level bracket restrictions
  // - Lower levels can ALWAYS attack higher levels
  // - Higher levels CANNOT attack lower brackets (except level 300)
  const levelCheck = canAttackByLevel(attackerStats.level, defenderStats.level);
  if (!levelCheck.canAttack) {
    return c.json({
      error: levelCheck.reason,
      attacker_bracket: getLevelBracket(attackerStats.level),
      defender_bracket: getLevelBracket(defenderStats.level),
    }, 400);
  }

  // Resolve battle
  const seed = crypto.randomUUID();
  const result = resolveBattle(attackerStats, defenderStats, seed, {}, false);

  // Calculate XP reward with multiplier for attacking higher levels
  const baseXp = getBaseAttackXp(defenderStats.level, result.attacker_won);
  const xpMultiplier = getAttackXpMultiplier(attackerStats.level, defenderStats.level);
  const xpGained = Math.floor(baseXp * xpMultiplier);

  // Get attacker's current XP and level for level-up check
  const attackerXpData = await db
    .prepare('SELECT xp, level FROM characters WHERE id = ?')
    .bind(attackerStats.id)
    .first<{ xp: number; level: number }>();

  const currentXp = attackerXpData?.xp || 0;
  const newXp = currentXp + xpGained;

  // Check for level up
  const levelUpResult = checkForLevelUp(attackerStats.level, newXp);

  // Create battle record
  const battleId = crypto.randomUUID();
  const now = new Date().toISOString();

  const statements = [
    // Consume stamina and add XP
    db.prepare('UPDATE characters SET current_stamina = current_stamina - 1, xp = ? WHERE id = ?')
      .bind(newXp, attackerStats.id),

    // Update defender health
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?')
      .bind(result.defender_health_after, defenderStats.id),

    // Create battle record
    db.prepare(`
      INSERT INTO battles (id, attacker_char_id, defender_char_id, mode, state, seed, battle_type, started_at, ended_at, winner_char_id, currency_stolen, defender_health_after)
      VALUES (?, ?, ?, 'async', 'completed', ?, 'normal', ?, ?, ?, ?, ?)
    `).bind(
      battleId,
      attackerStats.id,
      defenderStats.id,
      seed,
      now,
      now,
      result.attacker_won ? attackerStats.id : defenderStats.id,
      result.currency_stolen,
      result.defender_health_after
    ),
  ];

  // Handle level up if applicable
  if (levelUpResult) {
    statements.push(
      db.prepare('UPDATE characters SET level = ?, unspent_stat_points = unspent_stat_points + ? WHERE id = ?')
        .bind(levelUpResult.newLevel, levelUpResult.pointsGained, attackerStats.id)
    );

    // Grant achievements for level milestones
    for (const achievementLevel of levelUpResult.achievementsEarned) {
      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO character_achievements (character_id, achievement_id)
          SELECT ?, id FROM achievements WHERE category = 'level' AND name LIKE '%${achievementLevel}%'
        `).bind(attackerStats.id)
      );
    }
  }

  // Transfer currency if stolen
  if (result.currency_stolen > 0) {
    statements.push(
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
        .bind(result.currency_stolen, attackerStats.id),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
        .bind(result.currency_stolen, defenderStats.id)
    );
  }

  // Update trophies and handle kill
  if (result.defender_killed) {
    statements.push(
      db.prepare('UPDATE trophies SET kills = kills + 1, wins = wins + 1 WHERE character_id = ?')
        .bind(attackerStats.id),
      db.prepare('UPDATE trophies SET deaths = deaths + 1, losses = losses + 1 WHERE character_id = ?')
        .bind(defenderStats.id),
      // Respawn defender with full health
      db.prepare('UPDATE characters SET current_health = max_health WHERE id = ?')
        .bind(defenderStats.id)
    );
  } else {
    statements.push(
      db.prepare(`UPDATE trophies SET wins = wins + ${result.attacker_won ? 1 : 0}, losses = losses + ${result.attacker_won ? 0 : 1} WHERE character_id = ?`)
        .bind(attackerStats.id),
      db.prepare(`UPDATE trophies SET wins = wins + ${!result.attacker_won ? 1 : 0}, losses = losses + ${!result.attacker_won ? 0 : 1} WHERE character_id = ?`)
        .bind(defenderStats.id)
    );
  }

  // Create battle feed entries
  statements.push(
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(attackerStats.id, battleId, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(defenderStats.id, battleId, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen)
  );

  await db.batch(statements);

  return c.json({
    data: {
      battle_id: battleId,
      result,
      xp_gained: xpGained,
      xp_multiplier: xpMultiplier,
      level_up: levelUpResult ? {
        new_level: levelUpResult.newLevel,
        stat_points_gained: levelUpResult.pointsGained,
        achievements_earned: levelUpResult.achievementsEarned,
      } : null,
    },
  });
});

// ============================================================================
// HITLIST SYSTEM
// ============================================================================

const postBountySchema = z.object({
  target_character_id: z.string(),
  bounty_amount: z.number().int().min(1000),
});

storm8.post('/hitlist/post', zValidator('json', postBountySchema), async (c) => {
  const user = c.get('user');
  const { target_character_id, bounty_amount } = c.req.valid('json');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT id, unbanked_currency FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string; unbanked_currency: number }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  if (char.id === target_character_id) {
    return c.json({ error: 'Cannot hitlist yourself' }, 400);
  }

  if (bounty_amount > char.unbanked_currency) {
    return c.json({ error: 'Insufficient currency' }, 400);
  }

  // Create hitlist entry and deduct bounty
  const hitlistId = crypto.randomUUID();
  await db.batch([
    db.prepare('INSERT INTO hitlist (id, target_character_id, posted_by_character_id, bounty_amount) VALUES (?, ?, ?, ?)')
      .bind(hitlistId, target_character_id, char.id, bounty_amount),
    db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
      .bind(bounty_amount, char.id),
  ]);

  return c.json({ data: { hitlist_id: hitlistId } });
});

storm8.get('/hitlist/active', async (c) => {
  const db = c.env.DB;

  const hitlists = await db
    .prepare(`
      SELECT h.*, c.gamertag as target_gamertag, c2.gamertag as posted_by_gamertag
      FROM hitlist h
      JOIN characters c ON h.target_character_id = c.id
      JOIN characters c2 ON h.posted_by_character_id = c2.id
      WHERE h.state = 'active'
      ORDER BY h.bounty_amount DESC
      LIMIT 50
    `)
    .all();

  return c.json({ data: hitlists.results });
});

const attackHitlistSchema = z.object({
  hitlist_id: z.string(),
});

storm8.post('/hitlist/attack', zValidator('json', attackHitlistSchema), async (c) => {
  const user = c.get('user');
  const { hitlist_id } = c.req.valid('json');
  const db = c.env.DB;

  const attackerChar = await db
    .prepare('SELECT id FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string }>();

  if (!attackerChar) {
    return c.json({ error: 'Character not found' }, 404);
  }

  // Get hitlist entry
  const hitlist = await db
    .prepare('SELECT * FROM hitlist WHERE id = ? AND state = \'active\'')
    .bind(hitlist_id)
    .first<{ id: string; target_character_id: string; bounty_amount: number; posted_by_character_id: string }>();

  if (!hitlist) {
    return c.json({ error: 'Hitlist entry not found or already claimed' }, 404);
  }

  if (hitlist.target_character_id === attackerChar.id) {
    return c.json({ error: 'Cannot attack yourself on hitlist' }, 400);
  }

  // Check daily limit (25 attacks per day per hitlist)
  const today = new Date().toISOString().split('T')[0];
  const attackCount = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM hitlist_attacks
      WHERE hitlist_id = ? AND attacker_character_id = ? AND DATE(attacked_at) = ?
    `)
    .bind(hitlist_id, attackerChar.id, today)
    .first<{ count: number }>();

  if ((attackCount?.count || 0) >= 25) {
    return c.json({ error: 'Daily hitlist attack limit reached (25)' }, 400);
  }

  // Apply regeneration and get stats
  await applyResourceRegeneration(db, attackerChar.id);

  const attackerStats = await getCharacterBattleStats(db, attackerChar.id);
  const defenderStats = await getCharacterBattleStats(db, hitlist.target_character_id);

  if (!attackerStats || !defenderStats) {
    return c.json({ error: 'Character stats not found' }, 404);
  }

  // Check stamina
  if (attackerStats.current_stamina < 1) {
    return c.json({ error: 'Insufficient stamina' }, 400);
  }

  // Resolve battle (hitlist = true, no health protection)
  const seed = crypto.randomUUID();
  const result = resolveBattle(attackerStats, defenderStats, seed, {}, true);

  const now = new Date().toISOString();
  const statements = [
    // Consume stamina
    db.prepare('UPDATE characters SET current_stamina = current_stamina - 1 WHERE id = ?')
      .bind(attackerStats.id),

    // Update defender health
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?')
      .bind(result.defender_health_after, defenderStats.id),

    // Log hitlist attack
    db.prepare('INSERT INTO hitlist_attacks (hitlist_id, attacker_character_id, damage_dealt, target_killed) VALUES (?, ?, ?, ?)')
      .bind(hitlist_id, attackerStats.id, result.damage_dealt, result.defender_killed),
  ];

  // Handle kill - award bounty and update hitlist
  if (result.defender_killed) {
    statements.push(
      db.prepare('UPDATE hitlist SET state = \'claimed\', claimed_at = ?, claimed_by_character_id = ? WHERE id = ?')
        .bind(now, attackerStats.id, hitlist_id),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
        .bind(hitlist.bounty_amount, attackerStats.id),
      db.prepare('UPDATE trophies SET kills = kills + 1 WHERE character_id = ?')
        .bind(attackerStats.id),
      db.prepare('UPDATE trophies SET deaths = deaths + 1 WHERE character_id = ?')
        .bind(defenderStats.id),
      // Respawn defender
      db.prepare('UPDATE characters SET current_health = max_health WHERE id = ?')
        .bind(defenderStats.id)
    );
  }

  await db.batch(statements);

  return c.json({
    data: {
      result,
      bounty_claimed: result.defender_killed,
      bounty_amount: result.defender_killed ? hitlist.bounty_amount : 0,
    },
  });
});

// ============================================================================
// BANKING SYSTEM
// ============================================================================

const bankCurrencySchema = z.object({
  amount: z.number().int().min(1),
});

storm8.post('/bank/deposit', zValidator('json', bankCurrencySchema), async (c) => {
  const user = c.get('user');
  const { amount } = c.req.valid('json');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT unbanked_currency FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ unbanked_currency: number }>();

  if (!char || amount > char.unbanked_currency) {
    return c.json({ error: 'Insufficient unbanked currency' }, 400);
  }

  // 10% deposit fee
  const fee = Math.floor(amount * 0.1);
  const banked = amount - fee;

  await db
    .prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ?, banked_currency = banked_currency + ? WHERE user_id = ?')
    .bind(amount, banked, user.id)
    .run();

  return c.json({ message: `Deposited ${banked} currency (${fee} fee)` });
});

// ============================================================================
// HOSPITAL (Healing)
// ============================================================================

storm8.post('/hospital/heal', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT current_health, max_health, unbanked_currency FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ current_health: number; max_health: number; unbanked_currency: number }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  if (char.current_health >= char.max_health) {
    return c.json({ error: 'Already at full health' }, 400);
  }

  // Healing cost: 10 currency per HP (simplified)
  const hpNeeded = char.max_health - char.current_health;
  const cost = hpNeeded * 10;

  if (cost > char.unbanked_currency) {
    return c.json({ error: 'Insufficient currency for full heal' }, 400);
  }

  await db
    .prepare('UPDATE characters SET current_health = max_health, unbanked_currency = unbanked_currency - ? WHERE user_id = ?')
    .bind(cost, user.id)
    .run();

  return c.json({ message: `Healed ${hpNeeded} HP for ${cost} currency` });
});

// ============================================================================
// BATTLE FEED
// ============================================================================

storm8.get('/feed', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const char = await db
    .prepare('SELECT id FROM characters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string }>();

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  const feed = await db
    .prepare(`
      SELECT
        bf.*,
        c1.gamertag as attacker_gamertag,
        c2.gamertag as defender_gamertag
      FROM battle_feed bf
      JOIN characters c1 ON bf.attacker_id = c1.id
      JOIN characters c2 ON bf.defender_id = c2.id
      WHERE bf.character_id = ?
      ORDER BY bf.created_at DESC
      LIMIT 10
    `)
    .bind(char.id)
    .all();

  return c.json({ data: feed.results });
});

export default storm8;
