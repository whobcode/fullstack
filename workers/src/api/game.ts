import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { firstAccessSchema } from '../shared/schemas/game';
import { MAX_LEVEL, getTotalStatPointsForLevel, getAllLevelAchievementsUpTo } from '../core/leveling';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

type BattleRow = {
  id: string;
  attacker_char_id: string;
  defender_char_id: string;
  mode: string;
  state: 'pending' | 'active' | 'completed' | 'canceled';
  seed: string;
  started_at?: string | null;
  ended_at?: string | null;
  winner_char_id?: string | null;
};

type CharacterRow = CharacterStats & {
  id: string;
  xp: number;
  level: number;
};

type SpecialAccount = {
  id: string;
  user_id: string;
  flag_type: string;
  all_slots_unlocked: number;
  auto_max_level: number;
};

// Slot pricing in cents
const SLOT_PRICES: Record<number, number> = {
  4: 500,   // $5
  5: 1000,  // $10
  6: 1500,  // $15
  7: 2000,  // $20
};

const FREE_SLOTS = 3;
const TOTAL_SLOTS = 7;

const game = new Hono<App>();

// All routes in this file are protected
game.use('*', authMiddleware);

const BASE_STATS = {
    phoenix:      { hp: 10000, atk: 1000, def: 500, mp: 175, spd: 100 },
    dphoenix:     { hp: 10000, atk: 1750, def: 375, mp: 150, spd: 150 },
    dragon:       { hp: 10000, atk: 750,  def: 1100, mp: 100, spd: 175 },
    ddragon:      { hp: 10000, atk: 1000, def: 1000, mp: 200, spd: 75  },
    kies:         { hp: 15000, atk: 750,  def: 750,  mp: 225, spd: 150 },
};

// Helper to check if user is a special account
async function getSpecialAccount(db: D1Database, userId: string): Promise<SpecialAccount | null> {
  return await db.prepare('SELECT * FROM special_accounts WHERE user_id = ?').bind(userId).first<SpecialAccount>();
}

// Helper to get available slots for user
async function getAvailableSlots(db: D1Database, userId: string): Promise<number[]> {
  const specialAccount = await getSpecialAccount(db, userId);

  // Special accounts get all slots
  if (specialAccount?.all_slots_unlocked) {
    return [1, 2, 3, 4, 5, 6, 7];
  }

  // Everyone gets first 3 slots free
  const availableSlots = [1, 2, 3];

  // Check for purchased slots
  const purchases = await db.prepare('SELECT slot_number FROM character_slot_purchases WHERE user_id = ?').bind(userId).all<{ slot_number: number }>();
  for (const purchase of purchases.results || []) {
    availableSlots.push(purchase.slot_number);
  }

  return availableSlots.sort((a, b) => a - b);
}

// Helper to get next available slot for a user
async function getNextAvailableSlot(db: D1Database, userId: string): Promise<number | null> {
  const availableSlots = await getAvailableSlots(db, userId);

  // Get existing character slots
  const existingChars = await db.prepare('SELECT slot_number FROM characters WHERE user_id = ?').bind(userId).all<{ slot_number: number }>();
  const usedSlots = new Set((existingChars.results || []).map(c => c.slot_number));

  // Find first available slot not in use
  for (const slot of availableSlots) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }

  return null;
}

// Get user's character slots info
game.get('/slots', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const availableSlots = await getAvailableSlots(db, user.id);
  const characters = await db.prepare('SELECT id, slot_number, gamertag, class, level, first_game_access_completed FROM characters WHERE user_id = ? ORDER BY slot_number').bind(user.id).all();

  const specialAccount = await getSpecialAccount(db, user.id);

  return c.json({
    data: {
      totalSlots: TOTAL_SLOTS,
      freeSlots: FREE_SLOTS,
      availableSlots,
      characters: characters.results || [],
      slotPrices: SLOT_PRICES,
      isSpecialAccount: !!specialAccount,
      canCreateMore: availableSlots.length > (characters.results?.length || 0),
    }
  });
});

// Purchase a character slot
const purchaseSlotSchema = z.object({
  slotNumber: z.number().min(4).max(7),
  transactionId: z.string().optional(), // For payment integration
});

game.post('/slots/purchase', zValidator('json', purchaseSlotSchema), async (c) => {
  const user = c.get('user');
  const { slotNumber, transactionId } = c.req.valid('json');
  const db = c.env.DB;

  // Check if slot is valid
  if (!SLOT_PRICES[slotNumber]) {
    return c.json({ error: 'Invalid slot number' }, 400);
  }

  // Check if slot already purchased
  const existing = await db.prepare('SELECT id FROM character_slot_purchases WHERE user_id = ? AND slot_number = ?')
    .bind(user.id, slotNumber).first();

  if (existing) {
    return c.json({ error: 'Slot already purchased' }, 400);
  }

  // Check if previous slots are purchased (must buy in order)
  for (let i = 4; i < slotNumber; i++) {
    const prevSlot = await db.prepare('SELECT id FROM character_slot_purchases WHERE user_id = ? AND slot_number = ?')
      .bind(user.id, i).first();
    if (!prevSlot) {
      return c.json({ error: `Must purchase slot ${i} first` }, 400);
    }
  }

  // Record the purchase (actual payment integration would go here)
  await db.prepare('INSERT INTO character_slot_purchases (user_id, slot_number, price_paid, transaction_id) VALUES (?, ?, ?, ?)')
    .bind(user.id, slotNumber, SLOT_PRICES[slotNumber], transactionId || null).run();

  return c.json({ message: `Slot ${slotNumber} purchased successfully!`, price: SLOT_PRICES[slotNumber] });
});

// Create a new character in an available slot
const createCharacterSchema = z.object({
  gamertag: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  class: z.enum(['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies']),
  slotNumber: z.number().min(1).max(7).optional(), // If not provided, uses next available
});

game.post('/characters/create', zValidator('json', createCharacterSchema), async (c) => {
  const user = c.get('user');
  const { gamertag, class: chosenClass, slotNumber: requestedSlot } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // Check if gamertag is unique
    const existingGamertag = await db.prepare('SELECT id FROM characters WHERE gamertag = ?').bind(gamertag).first();
    if (existingGamertag) {
      return c.json({ error: 'Gamertag is already taken.' }, 409);
    }

    // Determine which slot to use
    let slotNumber: number;
    if (requestedSlot) {
      const availableSlots = await getAvailableSlots(db, user.id);
      if (!availableSlots.includes(requestedSlot)) {
        return c.json({ error: 'Slot not available. Purchase required.' }, 400);
      }

      // Check if slot is already in use
      const existingInSlot = await db.prepare('SELECT id FROM characters WHERE user_id = ? AND slot_number = ?')
        .bind(user.id, requestedSlot).first();
      if (existingInSlot) {
        return c.json({ error: 'Slot already has a character.' }, 400);
      }

      slotNumber = requestedSlot;
    } else {
      const nextSlot = await getNextAvailableSlot(db, user.id);
      if (nextSlot === null) {
        return c.json({ error: 'No available character slots. Purchase more slots.' }, 400);
      }
      slotNumber = nextSlot;
    }

    // Check for special account (auto max level)
    const specialAccount = await getSpecialAccount(db, user.id);
    const isAutoMaxLevel = specialAccount?.auto_max_level === 1;

    // Calculate stats
    const stats = BASE_STATS[chosenClass];
    const level = isAutoMaxLevel ? MAX_LEVEL : 1;
    const xp = isAutoMaxLevel ? 999999999 : 0; // High XP for max level
    const unspentStatPoints = isAutoMaxLevel ? getTotalStatPointsForLevel(MAX_LEVEL) : 0;

    // Create character
    const characterId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO characters (id, user_id, slot_number, gamertag, class, level, xp, hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `).bind(
      characterId, user.id, slotNumber, gamertag, chosenClass,
      level, xp, stats.hp, stats.atk, stats.def, stats.mp, stats.spd,
      unspentStatPoints
    ).run();

    // Create trophies record
    await db.prepare('INSERT INTO trophies (character_id) VALUES (?)').bind(characterId).run();

    // Grant level achievements if auto max level
    if (isAutoMaxLevel) {
      const achievementLevels = getAllLevelAchievementsUpTo(MAX_LEVEL);
      for (const lvl of achievementLevels) {
        const achievement = await db.prepare('SELECT id FROM achievements WHERE requirement_json LIKE ?')
          .bind(`%"value": ${lvl}%`).first<{ id: string }>();
        if (achievement) {
          await db.prepare('INSERT OR IGNORE INTO character_achievements (character_id, achievement_id) VALUES (?, ?)')
            .bind(characterId, achievement.id).run();
        }
      }
    }

    return c.json({
      message: isAutoMaxLevel
        ? `Character created at max level ${MAX_LEVEL}!`
        : 'Character created successfully!',
      data: { characterId, slotNumber, level }
    });
  } catch (e) {
    console.error("Create character error:", e);
    return c.json({ error: 'Failed to create character.' }, 500);
  }
});

// First time game access setup (legacy - updates existing character from auth flow)
game.post('/first-access', zValidator('json', firstAccessSchema), async (c) => {
  const user = c.get('user');
  const { gamertag, class: chosenClass } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // 1. Check if character setup is already complete (find any incomplete character)
    const character = await db.prepare('SELECT id, first_game_access_completed, slot_number FROM characters WHERE user_id = ? AND first_game_access_completed = FALSE').bind(user.id).first<{id: string, first_game_access_completed: number, slot_number: number}>();

    if (!character) {
        // No incomplete character, check if user has any characters
        const existingChar = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(user.id).first();
        if (existingChar) {
          return c.json({ error: 'All your characters are already set up. Use /characters/create for new characters.' }, 400);
        }
        return c.json({ error: 'Character not found for this user.' }, 404);
    }

    // 2. Check if gamertag is unique
    const existingGamertag = await db.prepare('SELECT id FROM characters WHERE gamertag = ?').bind(gamertag).first();
    if (existingGamertag) {
      return c.json({ error: 'Gamertag is already taken.' }, 409);
    }

    // 3. Check for special account (auto max level)
    const specialAccount = await getSpecialAccount(db, user.id);
    const isAutoMaxLevel = specialAccount?.auto_max_level === 1;

    // 4. Get base stats for the chosen class
    const stats = BASE_STATS[chosenClass];
    const level = isAutoMaxLevel ? MAX_LEVEL : 1;
    const xp = isAutoMaxLevel ? 999999999 : 0;
    const unspentStatPoints = isAutoMaxLevel ? getTotalStatPointsForLevel(MAX_LEVEL) : 0;

    // 5. Update the character record
    await db.prepare(`
        UPDATE characters
        SET gamertag = ?, class = ?, level = ?, xp = ?, hp = ?, atk = ?, def = ?, mp = ?, spd = ?, unspent_stat_points = ?, first_game_access_completed = TRUE
        WHERE id = ?
    `)
    .bind(gamertag, chosenClass, level, xp, stats.hp, stats.atk, stats.def, stats.mp, stats.spd, unspentStatPoints, character.id)
    .run();

    // 6. Grant level achievements if auto max level
    if (isAutoMaxLevel) {
      const achievementLevels = getAllLevelAchievementsUpTo(MAX_LEVEL);
      for (const lvl of achievementLevels) {
        const achievement = await db.prepare('SELECT id FROM achievements WHERE requirement_json LIKE ?')
          .bind(`%"value": ${lvl}%`).first<{ id: string }>();
        if (achievement) {
          await db.prepare('INSERT OR IGNORE INTO character_achievements (character_id, achievement_id) VALUES (?, ?)')
            .bind(character.id, achievement.id).run();
        }
      }
    }

    return c.json({
      message: isAutoMaxLevel
        ? `Welcome to the game! Your character starts at max level ${MAX_LEVEL}!`
        : 'Welcome to the game! Your character has been set up.',
      data: { level, unspentStatPoints }
    });
  } catch (e) {
    console.error("Game first-access error:", e);
    return c.json({ error: 'Failed to set up character.' }, 500);
  }
});

// List all characters to challenge (excludes current user's characters)
game.get('/characters', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const characters = await db.prepare('SELECT id, gamertag, level, class FROM characters WHERE first_game_access_completed = TRUE AND user_id != ?').bind(user.id).all();
    return c.json({ data: characters.results });
});

// Get all user's characters
game.get('/my-characters', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const characters = await db.prepare(`
        SELECT c.*, t.wins, t.losses, t.kills, t.deaths
        FROM characters c
        LEFT JOIN trophies t ON c.id = t.character_id
        WHERE c.user_id = ?
        ORDER BY c.slot_number
    `).bind(user.id).all();

    return c.json({ data: characters.results || [] });
});

// Get character details (optionally by slot number)
game.get('/character', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const slotNumber = c.req.query('slot');

    let query = `
        SELECT c.*, t.wins, t.losses, t.kills, t.deaths
        FROM characters c
        LEFT JOIN trophies t ON c.id = t.character_id
        WHERE c.user_id = ?
    `;

    if (slotNumber) {
      query += ` AND c.slot_number = ${parseInt(slotNumber, 10)}`;
    } else {
      // Default to slot 1 if no slot specified
      query += ' ORDER BY c.slot_number LIMIT 1';
    }

    const character = await db.prepare(query).bind(user.id).first();

    if (!character) {
        return c.json({ error: 'Character not found.' }, 404);
    }

    return c.json({ data: character });
});

// Get a specific character by ID
game.get('/character/:id', async (c) => {
    const user = c.get('user');
    const characterId = c.req.param('id');
    const db = c.env.DB;

    const character = await db.prepare(`
        SELECT c.*, t.wins, t.losses, t.kills, t.deaths
        FROM characters c
        LEFT JOIN trophies t ON c.id = t.character_id
        WHERE c.id = ? AND c.user_id = ?
    `).bind(characterId, user.id).first();

    if (!character) {
        return c.json({ error: 'Character not found or does not belong to you.' }, 404);
    }

    return c.json({ data: character });
});

// Delete a character (keep the slot)
game.delete('/character/:id', async (c) => {
    const user = c.get('user');
    const characterId = c.req.param('id');
    const db = c.env.DB;

    const character = await db.prepare('SELECT id, slot_number FROM characters WHERE id = ? AND user_id = ?')
      .bind(characterId, user.id).first<{ id: string; slot_number: number }>();

    if (!character) {
        return c.json({ error: 'Character not found or does not belong to you.' }, 404);
    }

    // Delete character (cascades to trophies, etc.)
    await db.prepare('DELETE FROM characters WHERE id = ?').bind(characterId).run();

    return c.json({ message: 'Character deleted. Slot is now available for a new character.', slot: character.slot_number });
});

import { allocatePointsSchema } from '../shared/schemas/game';

// Allocate stat points
game.post('/character/allocate-points', zValidator('json', allocatePointsSchema), async (c) => {
    const user = c.get('user');
    const pointsToAllocate = c.req.valid('json');
    const db = c.env.DB;

    const totalPointsToSpend = Object.values(pointsToAllocate).reduce((sum, val) => sum + val, 0);

    const character = await db.prepare('SELECT id, unspent_stat_points FROM characters WHERE user_id = ?').bind(user.id).first<{id: string, unspent_stat_points: number}>();

    if (!character) {
        return c.json({ error: 'Character not found.' }, 404);
    }

    if (totalPointsToSpend <= 0 || totalPointsToSpend > character.unspent_stat_points) {
        return c.json({ error: 'Invalid number of points to allocate.' }, 400);
    }

    await db.prepare(`
        UPDATE characters
        SET
            hp = hp + ?,
            atk = atk + ?,
            def = def + ?,
            mp = mp + ?,
            spd = spd + ?,
            unspent_stat_points = unspent_stat_points - ?
        WHERE id = ?
    `).bind(
        pointsToAllocate.hp,
        pointsToAllocate.atk,
        pointsToAllocate.def,
        pointsToAllocate.mp,
        pointsToAllocate.spd,
        totalPointsToSpend,
        character.id
    ).run();

    return c.json({ message: 'Stat points allocated successfully.' });
});


import { createBattleSchema, submitTurnSchema } from '../shared/schemas/game';
import { resolveTurn } from '../core/battle-engine';
import type { ClassMods, CharacterStats } from '../core/battle-engine';
import { checkForLevelUp } from '../core/leveling';

// Create a new battle - resolves instantly without needing defender confirmation
game.post('/battles', zValidator('json', createBattleSchema), async (c) => {
    const user = c.get('user');
    const { defenderId, mode } = c.req.valid('json');
    const db = c.env.DB;

    const charQuery = 'SELECT id, hp, atk, def, class, xp, level FROM characters WHERE';
    const attackerChar = await db.prepare(`${charQuery} user_id = ?`).bind(user.id).first<CharacterRow>();
    if (!attackerChar) {
        return c.json({ error: 'Attacker character not found.' }, 404);
    }

    if (attackerChar.id === defenderId) {
        return c.json({ error: "You can't battle yourself." }, 400);
    }

    const defenderChar = await db.prepare(`${charQuery} id = ?`).bind(defenderId).first<CharacterRow>();
    if (!defenderChar) {
        return c.json({ error: 'Defender not found.' }, 404);
    }

    const battleId = crypto.randomUUID();
    const seed = crypto.randomUUID();
    const now = new Date().toISOString();

    // Resolve the battle immediately
    const classMods: ClassMods = JSON.parse(c.env.CLASS_MODS);
    const mitigationFactor = parseFloat(c.env.MITIGATION_FACTOR);
    const turnResult = resolveTurn(attackerChar, defenderChar, classMods, seed, mitigationFactor);

    const defenderHpAfter = defenderChar.hp - turnResult.damage;
    const turnId = crypto.randomUUID();

    const statements = [
        // Create battle record (already completed)
        db.prepare('INSERT INTO battles (id, attacker_char_id, defender_char_id, mode, state, seed, started_at, ended_at, winner_char_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(battleId, attackerChar.id, defenderId, mode, 'completed', seed, now, now, turnResult.attackerWins ? attackerChar.id : defenderChar.id),
        // Log the turn
        db.prepare('INSERT INTO battle_turns (id, battle_id, turn_index, actor_char_id, action_type, damage, hp_after_target) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(turnId, battleId, 1, attackerChar.id, 'attack', turnResult.damage, defenderHpAfter),
        // Update defender's HP
        db.prepare('UPDATE characters SET hp = ? WHERE id = ?').bind(defenderHpAfter, defenderChar.id),
        // Update trophies (win/loss)
        db.prepare('UPDATE trophies SET wins = wins + ?, losses = losses + ? WHERE character_id = ?')
            .bind(turnResult.attackerWins ? 1 : 0, turnResult.attackerWins ? 0 : 1, attackerChar.id),
        db.prepare('UPDATE trophies SET wins = wins + ?, losses = losses + ? WHERE character_id = ?')
            .bind(turnResult.defenderWins ? 1 : 0, turnResult.defenderWins ? 0 : 1, defenderChar.id),
    ];

    // Handle kill
    if (turnResult.killed) {
        const winXp = parseInt(c.env.WIN_XP_AWARD, 10);
        statements.push(
            // Update trophies (kill/death)
            db.prepare('UPDATE trophies SET kills = kills + 1 WHERE character_id = ?').bind(attackerChar.id),
            db.prepare('UPDATE trophies SET deaths = deaths + 1 WHERE character_id = ?').bind(defenderChar.id),
            // Award XP to winner
            db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').bind(winXp, attackerChar.id),
        );

        // Check for level up
        const newTotalXp = attackerChar.xp + winXp;
        const levelUpResult = checkForLevelUp(attackerChar.level, newTotalXp);
        if (levelUpResult) {
            statements.push(
                db.prepare('UPDATE characters SET level = ?, unspent_stat_points = unspent_stat_points + ? WHERE id = ?')
                    .bind(levelUpResult.newLevel, levelUpResult.pointsGained, attackerChar.id)
            );
        }
    }

    await db.batch(statements);

    return c.json({
        data: {
            battleId,
            result: turnResult,
            defenderHpAfter,
            battleCompleted: true
        }
    });
});

// Get battles for the current user
game.get('/battles', authMiddleware, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const character = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(user.id).first<{id: string}>();
    if (!character) return c.json({ data: [] });

    const battles = await db.prepare('SELECT * FROM battles WHERE attacker_char_id = ? OR defender_char_id = ? ORDER BY started_at DESC')
        .bind(character.id, character.id)
        .all();

    return c.json({ data: battles.results });
});

// Get a specific battle's state
game.get('/battles/:id', async (c) => {
    const battleId = c.req.param('id');
    const db = c.env.DB;

    const battle = await db.prepare('SELECT * FROM battles WHERE id = ?').bind(battleId).first();
    if (!battle) return c.json({ error: 'Battle not found' }, 404);

    const turns = await db.prepare('SELECT * FROM battle_turns WHERE battle_id = ? ORDER BY turn_index ASC').bind(battleId).all();

    // We could also join with character tables to get gamertags

    return c.json({ data: { ...battle, turns: turns.results } });
});

// Submit a turn for a battle (DEPRECATED - battles now resolve instantly)
// Kept for backwards compatibility with any existing pending battles
game.post('/battles/:id/turn', zValidator('json', submitTurnSchema), async (c) => {
    const battleId = c.req.param('id');
    const db = c.env.DB;

    const battle = await db.prepare('SELECT * FROM battles WHERE id = ?').bind(battleId).first<BattleRow>();
    if (!battle) return c.json({ error: 'Battle not found' }, 404);

    // All new battles complete instantly, so this endpoint is deprecated
    if (battle.state === 'completed') {
        return c.json({ error: 'Battle already completed. Battles now resolve instantly when created.' }, 400);
    }

    // For any legacy pending battles, complete them now
    if (battle.state === 'pending' || battle.state === 'active') {
        const now = new Date().toISOString();
        await db.prepare('UPDATE battles SET state = ?, ended_at = ? WHERE id = ?')
            .bind('completed', now, battleId).run();
        return c.json({ error: 'Legacy battle has been auto-completed. Battles now resolve instantly.' }, 400);
    }

    return c.json({ error: 'This endpoint is deprecated. Battles resolve instantly when created.' }, 400);
});

// ============================================================================
// STORY MODE (Coming Soon)
// ============================================================================

// Get story mode status
game.get('/story', async (c) => {
    const db = c.env.DB;

    const chapters = await db.prepare('SELECT * FROM story_chapters ORDER BY chapter_number').all();

    return c.json({
      data: {
        available: false,
        message: 'Story mode is coming soon! Check back later for an epic adventure.',
        chapters: chapters.results || [],
      }
    });
});

// Get character story progress (placeholder)
game.get('/story/progress', async (c) => {
    const user = c.get('user');
    const characterId = c.req.query('characterId');
    const db = c.env.DB;

    if (!characterId) {
      return c.json({ error: 'Character ID required' }, 400);
    }

    // Verify character belongs to user
    const character = await db.prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(characterId, user.id).first();

    if (!character) {
      return c.json({ error: 'Character not found' }, 404);
    }

    const progress = await db.prepare(`
      SELECT sp.*, sc.title, sc.chapter_number
      FROM character_story_progress sp
      JOIN story_chapters sc ON sp.chapter_id = sc.id
      WHERE sp.character_id = ?
      ORDER BY sc.chapter_number
    `).bind(characterId).all();

    return c.json({
      data: {
        available: false,
        message: 'Story mode is coming soon!',
        progress: progress.results || [],
      }
    });
});

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

// Get all achievements
game.get('/achievements', async (c) => {
    const db = c.env.DB;

    const achievements = await db.prepare('SELECT * FROM achievements ORDER BY display_order').all();

    return c.json({ data: achievements.results || [] });
});

// Get character achievements
game.get('/achievements/:characterId', async (c) => {
    const user = c.get('user');
    const characterId = c.req.param('characterId');
    const db = c.env.DB;

    // Verify character belongs to user
    const character = await db.prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(characterId, user.id).first();

    if (!character) {
      return c.json({ error: 'Character not found or does not belong to you.' }, 404);
    }

    const earned = await db.prepare(`
      SELECT a.*, ca.earned_at
      FROM character_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      WHERE ca.character_id = ?
      ORDER BY ca.earned_at
    `).bind(characterId).all();

    return c.json({ data: earned.results || [] });
});

// ============================================================================
// MAX LEVEL INFO
// ============================================================================

// Get game constants
game.get('/constants', async (c) => {
    return c.json({
      data: {
        maxLevel: MAX_LEVEL,
        freeSlots: FREE_SLOTS,
        totalSlots: TOTAL_SLOTS,
        slotPrices: SLOT_PRICES,
        classes: Object.keys(BASE_STATS),
      }
    });
});

export default game;
