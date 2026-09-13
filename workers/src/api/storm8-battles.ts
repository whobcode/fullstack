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
  canAttackByLevel,
  getAttackXpMultiplier,
  getBaseAttackXp,
  getLevelBracket,
  calculateAttackPower,
  calculateDefensePower,
} from '../core/storm8-battle-engine';
import { checkForLevelUp } from '../core/leveling';
import { applyResourceRegeneration } from '../core/regen';
import { getCharacterBattleStats, bumpTrophies } from '../core/battle';
import { deposit, withdraw, getSnapshot, recentLedger, BankError, DEPOSIT_FEE_RATE } from '../core/bank';
import { canPurchase, requiredLevelFor, STAMINA_BONUS_SUBQUERY, maxHealthExpr, type AbilityRow } from '../core/abilities';
import { BASE_STATS } from '../core/classes';
import {
  canList,
  getGlobalStatus,
  recordGlobalIfSaturated,
  MAX_LISTINGS_PER_TARGET,
  MAX_LISTINGS_PER_POSTER,
  MIN_POSTERS_TO_GLOBAL,
} from '../core/hitlist';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

const storm8 = new Hono<App>();

// All routes require authentication
storm8.use('*', authMiddleware);

// Resolve which of the user's characters is acting. An explicit ?character_id=
// wins; otherwise we use the user's chosen active character; otherwise slot 1.
// Returns null if a character_id was provided that the user doesn't own.
async function actingCharId(db: D1Database, c: any, userId: string): Promise<string | null> {
  const requested = c.req.query('character_id');
  if (requested) {
    const owned = await db
      .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(requested, userId)
      .first<{ id: string }>();
    return owned ? owned.id : null;
  }
  // Default to the user's active ("playing as") character if it's still theirs.
  const u = await db
    .prepare('SELECT active_character_id FROM users WHERE id = ?')
    .bind(userId)
    .first<{ active_character_id: string | null }>();
  if (u?.active_character_id) {
    const ok = await db
      .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(u.active_character_id, userId)
      .first<{ id: string }>();
    if (ok) return ok.id;
  }
  const first = await db
    .prepare('SELECT id FROM characters WHERE user_id = ? ORDER BY slot_number LIMIT 1')
    .bind(userId)
    .first<{ id: string }>();
  return first ? first.id : null;
}

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

  const charId = await actingCharId(db, c, user.id);
  if (!charId) {
    return c.json({ error: 'Character not found' }, 404);
  }
  const char = await db
    .prepare('SELECT unspent_stat_points FROM characters WHERE id = ?')
    .bind(charId)
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
        max_health = max_health + (? * 100),
        current_health = current_health + (? * 100),
        max_energy = 20 + (energy_skill_points + ?),
        -- The ability bonus is added back explicitly; recomputing from skill
        -- points alone would silently erase every Stamina Stone owned.
        max_stamina = 5 + (stamina_skill_points + ?) + ${STAMINA_BONUS_SUBQUERY}
      WHERE id = ?
    `)
    .bind(
      allocation.attack,
      allocation.defense,
      allocation.health,
      allocation.energy,
      allocation.stamina,
      totalAllocated,
      allocation.health,
      allocation.health,
      allocation.energy,
      allocation.stamina,
      charId
    )
    .run();

  // Log the allocation
  const allocations = Object.entries(allocation)
    .filter(([_, points]) => points > 0)
    .map(([stat, points]) =>
      db.prepare('INSERT INTO skill_allocations (character_id, stat_type, points_allocated) VALUES (?, ?, ?)')
        .bind(charId, stat, points)
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

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id, level FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string; level: number }>() : null;

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

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string }>() : null;

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

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id, level FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string; level: number }>() : null;

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  // Everything the character could ever buy, with how many they hold and the
  // level the next copy needs. Abilities that stack are deliberately still
  // listed once the base requirement is met but the *next* copy is out of
  // reach, so the shop can show the schedule rather than hiding the row.
  const abilities = await db
    .prepare(`
      SELECT a.*, COALESCE(ca.quantity, 0) AS owned
      FROM abilities a
      LEFT JOIN character_abilities ca
             ON ca.ability_id = a.id AND ca.character_id = ?
      WHERE a.level_requirement <= ?
      ORDER BY a.cost ASC
    `)
    .bind(char.id, char.level)
    .all<AbilityRow & { owned: number }>();

  const rows = (abilities.results || []).map((a) => {
    const check = canPurchase(a, a.owned, char.level, Number.MAX_SAFE_INTEGER);
    return {
      ...a,
      owned: a.owned,
      required_level: requiredLevelFor(a, a.owned),
      at_max: a.owned >= a.max_quantity,
      // Currency is checked at purchase time, not here.
      unlocked: check.ok,
    };
  });

  return c.json({ data: rows });
});

const purchaseAbilitySchema = z.object({
  ability_id: z.string(),
});

storm8.post('/abilities/purchase', zValidator('json', purchaseAbilitySchema), async (c) => {
  const user = c.get('user');
  const { ability_id } = c.req.valid('json');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id, unbanked_currency, level, class FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string; unbanked_currency: number; level: number; class: keyof typeof BASE_STATS }>() : null;

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  const ability = await db
    .prepare('SELECT * FROM abilities WHERE id = ?')
    .bind(ability_id)
    .first<AbilityRow>();

  if (!ability) {
    return c.json({ error: 'Ability not found' }, 404);
  }

  const ownedRow = await db
    .prepare('SELECT quantity FROM character_abilities WHERE character_id = ? AND ability_id = ?')
    .bind(char.id, ability.id)
    .first<{ quantity: number }>();
  const owned = ownedRow?.quantity ?? 0;

  const check = canPurchase(ability, owned, char.level, char.unbanked_currency);
  if (!check.ok) {
    return c.json({ error: check.error, owned, required_level: check.required_level }, 400);
  }

  // One batch: the overdraft trigger and the stack-cap triggers abort the whole
  // thing rather than letting a half-purchase commit.
  const statements = [
    db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
      .bind(ability.cost, char.id),
    db.prepare('INSERT INTO character_abilities (character_id, ability_id, quantity) VALUES (?, ?, 1) ON CONFLICT(character_id, ability_id) DO UPDATE SET quantity = quantity + 1')
      .bind(char.id, ability.id),
  ];

  // Utility abilities raise the stamina cap. Current stamina rises with it so
  // buying a stone is immediately useful rather than leaving a gap to refill.
  if (ability.stamina_bonus > 0) {
    statements.push(
      db.prepare('UPDATE characters SET max_stamina = max_stamina + ?, current_stamina = current_stamina + ? WHERE id = ?')
        .bind(ability.stamina_bonus, ability.stamina_bonus, char.id),
    );
  }

  // Health abilities change the pool, so it is recomputed from scratch rather
  // than incremented — hp_pct is a percentage of the whole and cannot be
  // applied as a delta. Runs after the ability row so it sees the new copy.
  if (ability.hp_value > 0 || ability.hp_pct > 0) {
    const baseHp = (BASE_STATS[char.class] ?? BASE_STATS.phoenix).hp;
    statements.push(
      db.prepare(`
        UPDATE characters
        SET max_health = ${maxHealthExpr(String(baseHp))},
            current_health = current_health + (${maxHealthExpr(String(baseHp))} - max_health)
        WHERE id = ?
      `).bind(char.id),
    );
  }

  try {
    await db.batch(statements);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.includes('ability stack limit')) {
      return c.json({ error: `You already hold the maximum of ${ability.max_quantity} ${ability.name}.` }, 400);
    }
    if (msg.includes('ability slot limit')) {
      return c.json({ error: 'You already hold 12 abilities. Sell one before buying another.' }, 400);
    }
    if (msg.includes('insufficient unbanked currency')) {
      return c.json({ error: 'You are not holding that much.' }, 400);
    }
    throw e;
  }

  return c.json({
    data: {
      ability_id: ability.id,
      name: ability.name,
      owned: owned + 1,
      max_quantity: ability.max_quantity,
      next_level_required: owned + 1 < ability.max_quantity
        ? requiredLevelFor(ability, owned + 1)
        : null,
    },
    message: `${ability.name} purchased (${owned + 1}/${ability.max_quantity})`,
  });
});

/**
 * Where every stat number comes from, split three ways.
 *
 * The character sheet shows base, what skill points added, and what abilities
 * add, each in its own colour, so a player can see which part of a stat they
 * actually control. Derived rather than stored: characters.atk/def/spd/hp hold
 * the running total, so the allocated share is total minus class base.
 */
storm8.get('/stats-breakdown', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  if (!charId) return c.json({ error: 'Character not found' }, 404);

  const ch = await db
    .prepare('SELECT id, class, level, atk, def, spd, max_health, max_stamina, health_skill_points, attack_skill_points, defense_skill_points FROM characters WHERE id = ? AND user_id = ?')
    .bind(charId, user.id)
    .first<any>();
  if (!ch) return c.json({ error: 'Character not found' }, 404);

  const base = BASE_STATS[ch.class as keyof typeof BASE_STATS] ?? BASE_STATS.phoenix;
  const stats = await getCharacterBattleStats(db, ch.id);

  // Equipment is wielded by you and each usable clan member; solo players still
  // get it once, which is why the multiplier is floored at 1.
  const clan = Math.max(1, stats?.usable_clan_members ?? 1);

  // Health and speed from abilities, summed straight from what is owned.
  const abilityTotals = await db
    .prepare(`
      SELECT
        COALESCE(SUM(ca.quantity * a.hp_value), 0)  AS hp_flat,
        COALESCE(SUM(ca.quantity * a.hp_pct), 0)    AS hp_pct,
        COALESCE(SUM(ca.quantity * a.spd_value), 0) AS spd
      FROM character_abilities ca
      JOIN abilities a ON a.id = ca.ability_id
      WHERE ca.character_id = ? AND a.kind = 'equipment'
    `)
    .bind(ch.id)
    .first<{ hp_flat: number; hp_pct: number; spd: number }>();

  const hpFromSkill = (ch.health_skill_points || 0) * 100;
  const hpFlat = abilityTotals?.hp_flat ?? 0;
  const hpPct = abilityTotals?.hp_pct ?? 0;
  // max_health already includes both; report the percentage share as the
  // difference so the three parts add up to what the character actually has.
  const hpFromPct = Math.max(0, (ch.max_health || 0) - (base.hp + hpFromSkill + hpFlat));

  const row = (label: string, baseVal: number, allocated: number, ability: number) => ({
    label, base: baseVal, allocated, ability, total: baseVal + allocated + ability,
  });

  return c.json({
    data: {
      character_id: ch.id,
      level: ch.level,
      clan_multiplier: clan,
      stats: [
        row('HP',  base.hp,  hpFromSkill, hpFlat + hpFromPct),
        row('ATK', base.atk, (ch.atk || 0) - base.atk, (stats?.equipment_attack ?? 0) * clan),
        row('DEF', base.def, (ch.def || 0) - base.def, (stats?.equipment_defense ?? 0) * clan),
        row('SPD', base.spd, (ch.spd || 0) - base.spd, abilityTotals?.spd ?? 0),
      ],
      // What the battle engine actually fights with, after the Storm8 formula.
      attack_power: stats ? calculateAttackPower(stats) : 0,
      defense_power: stats ? calculateDefensePower(stats) : 0,
    },
  });
});

// Sell one copy back for a percentage of what it cost (45% by default).
const sellAbilitySchema = z.object({ ability_id: z.string() });

storm8.post('/abilities/sell', zValidator('json', sellAbilitySchema), async (c) => {
  const user = c.get('user');
  const { ability_id } = c.req.valid('json');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id, class FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string; class: keyof typeof BASE_STATS }>() : null;

  if (!char) return c.json({ error: 'Character not found' }, 404);

  const row = await db
    .prepare(`
      SELECT a.id, a.name, a.cost, a.sellback_pct, a.stamina_bonus, a.hp_value, a.hp_pct,
             ca.quantity
      FROM abilities a
      JOIN character_abilities ca ON ca.ability_id = a.id AND ca.character_id = ?
      WHERE a.id = ?
    `)
    .bind(char.id, ability_id)
    .first<{ id: string; name: string; cost: number; sellback_pct: number; stamina_bonus: number; hp_value: number; hp_pct: number; quantity: number }>();

  if (!row || row.quantity <= 0) {
    return c.json({ error: 'You do not own that ability.' }, 400);
  }

  const refund = Math.floor((row.cost * row.sellback_pct) / 100);
  const baseHp = (BASE_STATS[char.class] ?? BASE_STATS.phoenix).hp;

  const statements = [
    row.quantity > 1
      ? db.prepare('UPDATE character_abilities SET quantity = quantity - 1 WHERE character_id = ? AND ability_id = ?')
          .bind(char.id, row.id)
      : db.prepare('DELETE FROM character_abilities WHERE character_id = ? AND ability_id = ?')
          .bind(char.id, row.id),
    db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
      .bind(refund, char.id),
  ];

  // Undo the stat the ability was granting. Health is recomputed rather than
  // decremented because hp_pct is a share of the whole pool.
  if (row.stamina_bonus > 0) {
    statements.push(
      db.prepare(`
        UPDATE characters
        SET max_stamina = max_stamina - ?,
            current_stamina = MIN(current_stamina, max_stamina - ?)
        WHERE id = ?
      `).bind(row.stamina_bonus, row.stamina_bonus, char.id),
    );
  }
  if (row.hp_value > 0 || row.hp_pct > 0) {
    statements.push(
      db.prepare(`
        UPDATE characters
        SET max_health = ${maxHealthExpr(String(baseHp))},
            current_health = MIN(current_health, ${maxHealthExpr(String(baseHp))})
        WHERE id = ?
      `).bind(char.id),
    );
  }

  await db.batch(statements);

  return c.json({
    data: { ability_id: row.id, name: row.name, refund, remaining: row.quantity - 1 },
    message: `Sold ${row.name} for ${refund.toLocaleString()} (${row.sellback_pct}% of ${row.cost.toLocaleString()}).`,
  });
});

storm8.get('/abilities/owned', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const owned = charId ? await db
    .prepare(`
      SELECT a.*, ca.quantity
      FROM character_abilities ca
      JOIN abilities a ON ca.ability_id = a.id
      WHERE ca.character_id = ?
      ORDER BY a.category, a.attack_value DESC
    `)
    .bind(charId)
    .all() : { results: [] };

  return c.json({ data: owned.results });
});

// ============================================================================
// RESOURCE REGENERATION HELPER
// ============================================================================

// applyResourceRegeneration now lives in core/regen.ts (energy + stamina + health),
// shared with the cron and the read endpoints.

// ============================================================================
// BATTLE STATS HELPER
// ============================================================================

// getCharacterBattleStats and bumpTrophies now live in core/battle.ts.

// If the target's owner has designated a defense character, the attack is
// challenged against THAT character instead of whichever one was targeted.
async function applyDefenseCharacter(db: D1Database, targetId: string): Promise<string> {
  const owner = await db
    .prepare('SELECT user_id FROM characters WHERE id = ?')
    .bind(targetId)
    .first<{ user_id: string }>();
  if (!owner) return targetId;
  const u = await db
    .prepare('SELECT defense_character_id FROM users WHERE id = ?')
    .bind(owner.user_id)
    .first<{ defense_character_id: string | null }>();
  if (u?.defense_character_id && u.defense_character_id !== targetId) {
    const dc = await db
      .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(u.defense_character_id, owner.user_id)
      .first<{ id: string }>();
    if (dc) return dc.id;
  }
  return targetId;
}

// Resolve a target character by id or (case-insensitive) gamertag/name.
async function resolveTargetId(db: D1Database, opts: { id?: string; gamertag?: string }): Promise<string | null> {
  if (opts.id) return opts.id;
  if (opts.gamertag) {
    const row = await db
      .prepare('SELECT id FROM characters WHERE gamertag = ? COLLATE NOCASE')
      .bind(opts.gamertag.trim())
      .first<{ id: string }>();
    return row ? row.id : null;
  }
  return null;
}

// ============================================================================
// NORMAL BATTLE (PvP Attack)
// ============================================================================

const attackPlayerSchema = z
  .object({
    defender_character_id: z.string().optional(),
    defender_gamertag: z.string().optional(),
  })
  .refine((d) => d.defender_character_id || d.defender_gamertag, { message: 'Provide a target name or id' });

storm8.post('/attack', zValidator('json', attackPlayerSchema), async (c) => {
  const user = c.get('user');
  const { defender_character_id, defender_gamertag } = c.req.valid('json');
  const db = c.env.DB;

  // Get attacker character (the one selected in the Battle tab)
  const attackerCharId = await actingCharId(db, c, user.id);
  const attackerChar = attackerCharId ? await db
    .prepare('SELECT id FROM characters WHERE id = ?')
    .bind(attackerCharId)
    .first<{ id: string }>() : null;

  if (!attackerChar) {
    return c.json({ error: 'Character not found' }, 404);
  }

  // Resolve the target by id or name, then redirect to the owner's designated
  // defense character (if any).
  const targetedId = await resolveTargetId(db, { id: defender_character_id, gamertag: defender_gamertag });
  if (!targetedId) {
    return c.json({ error: `No character found named "${defender_gamertag ?? ''}"` }, 404);
  }
  const defenderId = await applyDefenseCharacter(db, targetedId);

  if (attackerChar.id === defenderId) {
    return c.json({ error: 'Cannot attack yourself' }, 400);
  }

  // Apply regeneration first
  await applyResourceRegeneration(db, attackerChar.id);

  // Get stats
  const attackerStats = await getCharacterBattleStats(db, attackerChar.id);
  const defenderStats = await getCharacterBattleStats(db, defenderId);

  if (!attackerStats || !defenderStats) {
    return c.json({ error: 'Character stats not found' }, 404);
  }

  // A defeated attacker can't fight until healed.
  if (attackerStats.current_health <= 0) {
    return c.json({ error: 'Your character has been defeated. Heal at the hospital before attacking.' }, 400);
  }

  // A defeated defender is unattackable until they recover.
  if (defenderStats.current_health <= 0) {
    return c.json({ error: 'This target has already been defeated and is recovering in the hospital.' }, 400);
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

    // Update attacker health (they can take counterattack damage)
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?')
      .bind(result.attacker_health_after, attackerStats.id),

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

  // Update trophies and handle kills. A defeated character stays at 0 health
  // (set above) — unattackable until they heal — rather than respawning. The
  // attacker can also die to the defender's counterattack.
  if (result.defender_killed) {
    statements.push(
      bumpTrophies(db, attackerStats.id, { kills: 1, wins: 1 }),
      bumpTrophies(db, defenderStats.id, { deaths: 1, losses: 1 })
    );
  } else if (result.attacker_killed) {
    statements.push(
      bumpTrophies(db, defenderStats.id, { kills: 1, wins: 1 }),
      bumpTrophies(db, attackerStats.id, { deaths: 1, losses: 1 })
    );
  } else {
    statements.push(
      bumpTrophies(db, attackerStats.id, result.attacker_won ? { wins: 1 } : { losses: 1 }),
      bumpTrophies(db, defenderStats.id, result.attacker_won ? { losses: 1 } : { wins: 1 })
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

  // Names for the battle visual.
  const names = await db
    .prepare('SELECT id, gamertag FROM characters WHERE id IN (?, ?)')
    .bind(attackerStats.id, defenderStats.id)
    .all<{ id: string; gamertag: string }>();
  const nameOf = (id: string) => names.results?.find((r) => r.id === id)?.gamertag ?? 'Unknown';

  return c.json({
    data: {
      battle_id: battleId,
      result,
      // Combatant snapshots so the client can render HP bars and the exchange.
      attacker: {
        id: attackerStats.id,
        gamertag: nameOf(attackerStats.id),
        health_before: attackerStats.current_health,
        health_after: result.attacker_health_after,
        max_health: attackerStats.max_health,
        killed: result.attacker_killed,
      },
      defender: {
        id: defenderStats.id,
        gamertag: nameOf(defenderStats.id),
        health_before: defenderStats.current_health,
        health_after: result.defender_health_after,
        max_health: defenderStats.max_health,
        killed: result.defender_killed,
      },
      first_striker: result.first_striker,
      attacker_hits: result.attacker_hits,
      defender_hits: result.defender_hits,
      damage_dealt: result.damage_dealt,
      damage_to_attacker: result.damage_to_attacker,
      currency_stolen: result.currency_stolen,
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

const postBountySchema = z
  .object({
    target_character_id: z.string().optional(),
    target_gamertag: z.string().optional(),
    bounty_amount: z.number().int().min(1000),
  })
  .refine((d) => d.target_character_id || d.target_gamertag, { message: 'Provide a target name or id' });

storm8.post('/hitlist/post', zValidator('json', postBountySchema), async (c) => {
  const user = c.get('user');
  const { target_character_id, target_gamertag, bounty_amount } = c.req.valid('json');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id, unbanked_currency FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string; unbanked_currency: number }>() : null;

  if (!char) {
    return c.json({ error: 'Character not found' }, 404);
  }

  const targetId = await resolveTargetId(db, { id: target_character_id, gamertag: target_gamertag });
  if (!targetId) {
    return c.json({ error: `No character found named "${target_gamertag ?? ''}"` }, 404);
  }

  if (char.id === targetId) {
    return c.json({ error: 'Cannot hitlist yourself' }, 400);
  }

  if (bounty_amount > char.unbanked_currency) {
    return c.json({ error: 'Insufficient currency' }, 400);
  }

  // Listing limits: 25 bounties from any one poster, 200 total per target per
  // rolling 24h. Hitting 200 globals the target (see core/hitlist.ts).
  const check = await canList(db, char.id, targetId);
  if (!check.ok) {
    return c.json({ error: check.error, global_status: check.status }, 429);
  }

  // Create hitlist entry and deduct bounty
  const hitlistId = crypto.randomUUID();
  await db.batch([
    db.prepare('INSERT INTO hitlist (id, target_character_id, posted_by_character_id, bounty_amount) VALUES (?, ?, ?, ?)')
      .bind(hitlistId, targetId, char.id, bounty_amount),
    db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
      .bind(bounty_amount, char.id),
  ]);

  // Did that listing max them out?
  const globalled = await recordGlobalIfSaturated(db, targetId);
  const status = await getGlobalStatus(db, targetId);

  return c.json({
    data: {
      hitlist_id: hitlistId,
      listings_from_you: check.from_this_poster + 1,
      listings_remaining_from_you: MAX_LISTINGS_PER_POSTER - (check.from_this_poster + 1),
      global_status: status,
      globalled,
    },
  });
});

// Hitlist saturation for one character: how close they are to being globalled.
storm8.get('/hitlist/status/:gamertag', async (c) => {
  const db = c.env.DB;
  const targetId = await resolveTargetId(db, { gamertag: c.req.param('gamertag') });
  if (!targetId) return c.json({ error: 'Character not found' }, 404);

  const status = await getGlobalStatus(db, targetId);
  const history = await db
    .prepare(`
      -- globalled_at defaults to CURRENT_TIMESTAMP (SQLite format); normalise
      -- to ISO so the browser does not read it as local time.
      SELECT listed_count, distinct_posters, cooldown_until,
             strftime('%Y-%m-%dT%H:%M:%SZ', globalled_at) AS globalled_at
      FROM character_globals
      WHERE character_id = ?
      ORDER BY globalled_at DESC
      LIMIT 10
    `)
    .bind(targetId)
    .all();

  return c.json({
    data: {
      ...status,
      max_listings: MAX_LISTINGS_PER_TARGET,
      max_per_poster: MAX_LISTINGS_PER_POSTER,
      min_posters_to_global: MIN_POSTERS_TO_GLOBAL,
      history: history.results || [],
    },
  });
});

storm8.get('/hitlist/active', async (c) => {
  const db = c.env.DB;

  // `poster_gamertag` and `target_current_health` are what the UI reads; they
  // were never selected, so both rendered blank.
  const hitlists = await db
    .prepare(`
      SELECT h.*,
             c.gamertag AS target_gamertag,
             c.current_health AS target_current_health,
             c.level AS target_level,
             c.globalled_until AS target_globalled_until,
             c2.gamertag AS poster_gamertag,
             c2.gamertag AS posted_by_gamertag
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

  const attackerCharId = await actingCharId(db, c, user.id);
  const attackerChar = attackerCharId ? await db
    .prepare('SELECT id FROM characters WHERE id = ?')
    .bind(attackerCharId)
    .first<{ id: string }>() : null;

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

  // You cannot collect on a bounty you placed with the character that placed
  // it — post on one character, hunt with another.
  if (hitlist.posted_by_character_id === attackerChar.id) {
    return c.json(
      { error: 'This character posted the bounty. Attack it with a different character.' },
      400,
    );
  }

  // No per-day attack cap: stamina is the only limiter. Each attack costs 1
  // stamina (regen is 1 per 3 min), so how often you can hunt a bounty is
  // bounded by your stamina pool rather than a daily counter.
  // hitlist_attacks is still written, as history rather than a quota.

  // Apply regeneration and get stats
  await applyResourceRegeneration(db, attackerChar.id);

  const attackerStats = await getCharacterBattleStats(db, attackerChar.id);
  const defenderStats = await getCharacterBattleStats(db, hitlist.target_character_id);

  if (!attackerStats || !defenderStats) {
    return c.json({ error: 'Character stats not found' }, 404);
  }

  if (attackerStats.current_health <= 0) {
    return c.json({ error: 'Your character has been defeated. Heal at the hospital before attacking.' }, 400);
  }

  if (defenderStats.current_health <= 0) {
    return c.json({ error: 'This target has already been defeated.' }, 400);
  }

  // Check stamina
  if (attackerStats.current_stamina < 1) {
    return c.json({ error: 'Insufficient stamina' }, 400);
  }

  // Resolve battle (hitlist = ambush: no health protection, no counterattack)
  const seed = crypto.randomUUID();
  const result = resolveBattle(attackerStats, defenderStats, seed, {}, true, false);

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

    // Both characters' feeds. Hitlist attacks were previously missing from
    // these, so an ambush left no trace on either wall.
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(attackerStats.id, null, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(defenderStats.id, null, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
  ];

  // Handle kill - award bounty and update hitlist. The target stays at 0 health
  // (defeated/unattackable) until they heal, rather than respawning instantly.
  if (result.defender_killed) {
    statements.push(
      db.prepare('UPDATE hitlist SET state = \'claimed\', claimed_at = ?, claimed_by_character_id = ? WHERE id = ?')
        .bind(now, attackerStats.id, hitlist_id),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
        .bind(hitlist.bounty_amount, attackerStats.id),
      bumpTrophies(db, attackerStats.id, { kills: 1, wins: 1 }),
      bumpTrophies(db, defenderStats.id, { deaths: 1, losses: 1 })
    );
  }

  await db.batch(statements);

  const names = await db
    .prepare('SELECT id, gamertag FROM characters WHERE id IN (?, ?)')
    .bind(attackerStats.id, defenderStats.id)
    .all<{ id: string; gamertag: string }>();
  const nameOf = (id: string) => names.results?.find((r) => r.id === id)?.gamertag ?? 'Unknown';

  return c.json({
    data: {
      result,
      // Combatant snapshot for the shared battle arena overlay.
      attacker: {
        id: attackerStats.id,
        gamertag: nameOf(attackerStats.id),
        health_before: attackerStats.current_health,
        health_after: result.attacker_health_after,
        max_health: attackerStats.max_health,
        killed: result.attacker_killed,
      },
      defender: {
        id: defenderStats.id,
        gamertag: nameOf(defenderStats.id),
        health_before: defenderStats.current_health,
        health_after: result.defender_health_after,
        max_health: defenderStats.max_health,
        killed: result.defender_killed,
      },
      first_striker: result.first_striker,
      attacker_hits: result.attacker_hits,
      defender_hits: result.defender_hits,
      damage_dealt: result.damage_dealt,
      damage_to_attacker: result.damage_to_attacker,
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

// Balance, holdings, and recent movements for the acting character.
storm8.get('/bank', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  if (!charId) return c.json({ error: 'Character not found' }, 404);

  const snapshot = await getSnapshot(db, charId);
  if (!snapshot) return c.json({ error: 'Character not found' }, 404);

  return c.json({
    data: {
      ...snapshot,
      deposit_fee_rate: DEPOSIT_FEE_RATE,
      ledger: await recentLedger(db, snapshot.user_id),
    },
  });
});

// Currency is per character, so both of these act on the acting character.
// /bank/deposit previously keyed on user_id alone: the balance check read an
// arbitrary one of the user's characters and the UPDATE carried no character
// filter, so a single deposit debited *every* character the account owned.
storm8.post('/bank/deposit', zValidator('json', bankCurrencySchema), async (c) => {
  const user = c.get('user');
  const { amount } = c.req.valid('json');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  if (!charId) return c.json({ error: 'Character not found' }, 404);

  try {
    const result = await deposit(db, charId, amount);
    return c.json({
      data: result,
      message: `Banked ${result.net.toLocaleString()}${result.fee ? ` (${result.fee.toLocaleString()} fee)` : ''}`,
    });
  } catch (e: any) {
    if (e instanceof BankError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

storm8.post('/bank/withdraw', zValidator('json', bankCurrencySchema), async (c) => {
  const user = c.get('user');
  const { amount } = c.req.valid('json');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  if (!charId) return c.json({ error: 'Character not found' }, 404);

  try {
    const result = await withdraw(db, charId, amount);
    return c.json({
      data: result,
      message: `Withdrew ${result.amount.toLocaleString()} — it can be stolen now.`,
    });
  } catch (e: any) {
    if (e instanceof BankError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

// ============================================================================
// HOSPITAL (Healing)
// ============================================================================

storm8.post('/hospital/heal', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT current_health, max_health, unbanked_currency FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ current_health: number; max_health: number; unbanked_currency: number }>() : null;

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
    .prepare('UPDATE characters SET current_health = max_health, unbanked_currency = unbanked_currency - ? WHERE id = ?')
    .bind(cost, charId)
    .run();

  return c.json({ message: `Healed ${hpNeeded} HP for ${cost} currency` });
});

// ============================================================================
// BATTLE FEED
// ============================================================================

storm8.get('/feed', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const charId = await actingCharId(db, c, user.id);
  const char = charId ? await db
    .prepare('SELECT id FROM characters WHERE id = ?')
    .bind(charId)
    .first<{ id: string }>() : null;

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
