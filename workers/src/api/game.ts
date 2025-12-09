/**
 * @module game
 * This module exports a Hono app that handles all game-related actions,
 * including character creation, battles, and stat allocation.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { firstAccessSchema } from '../shared/schemas/game';

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

const game = new Hono<App>();

// All routes in this file are protected
game.use('*', authMiddleware);

/**
 * @typedef {object} BattleRow
 * Represents a battle record from the database.
 * @property {string} id - The unique identifier for the battle.
 * @property {string} attacker_char_id - The ID of the attacking character.
 * @property {string} defender_char_id - The ID of the defending character.
 * @property {string} mode - The mode of the battle (e.g., 'async').
 * @property {'pending' | 'active' | 'completed' | 'canceled'} state - The current state of the battle.
 * @property {string} seed - A random seed for battle calculations.
 * @property {string | null} [started_at] - The timestamp when the battle started.
 * @property {string | null} [ended_at] - The timestamp when the battle ended.
 * @property {string | null} [winner_char_id] - The ID of the winning character, if applicable.
 */

/**
 * @typedef {object} CharacterRow
 * Represents a character record from the database, including stats.
 * @property {string} id - The unique identifier for the character.
 * @property {number} xp - The character's experience points.
 * @property {number} level - The character's current level.
 * @property {number} hp - Health points.
 * @property {number} atk - Attack power.
 * @property {number} def - Defense power.
 * @property {number} mp - Magic points.
 * @property {number} spd - Speed.
 */

const BASE_STATS = {
    phoenix:      { hp: 10000, atk: 1000, def: 500, mp: 175, spd: 100 },
    dphoenix:     { hp: 10000, atk: 1750, def: 375, mp: 150, spd: 150 },
    dragon:       { hp: 10000, atk: 750,  def: 1100, mp: 100, spd: 175 },
    ddragon:      { hp: 10000, atk: 1000, def: 1000, mp: 200, spd: 75  },
    kies:         { hp: 15000, atk: 750,  def: 750,  mp: 225, spd: 150 },
};

/**
 * Handles the initial setup for a user's character when they first access the game.
 * This includes setting their gamertag, class, and initial stats.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response confirming setup or providing an error.
 */
game.post('/first-access', zValidator('json', firstAccessSchema), async (c) => {
  const user = c.get('user');
  const { gamertag, class: chosenClass } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // 1. Check if character setup is already complete
    const character = await db.prepare('SELECT id, first_game_access_completed FROM characters WHERE user_id = ?').bind(user.id).first<{id: string, first_game_access_completed: number}>();

    if (!character) {
        return c.json({ error: 'Character not found for this user.' }, 404);
    }
    if (character.first_game_access_completed) {
      return c.json({ error: 'You have already completed the first-time setup.' }, 400);
    }

    // 2. Check if gamertag is unique
    const existingGamertag = await db.prepare('SELECT id FROM characters WHERE gamertag = ?').bind(gamertag).first();
    if (existingGamertag) {
      return c.json({ error: 'Gamertag is already taken.' }, 409);
    }

    // 3. Get base stats for the chosen class
    const stats = BASE_STATS[chosenClass];

    // 4. Update the character record
    await db.prepare(`
        UPDATE characters
        SET gamertag = ?, class = ?, hp = ?, atk = ?, def = ?, mp = ?, spd = ?, first_game_access_completed = TRUE
        WHERE id = ?
    `)
    .bind(gamertag, chosenClass, stats.hp, stats.atk, stats.def, stats.mp, stats.spd, character.id)
    .run();

    return c.json({ message: 'Welcome to the game! Your character has been set up.' });
  } catch (e) {
    console.error("Game first-access error:", e);
    return c.json({ error: 'Failed to set up character.' }, 500);
  }
});

/**
 * Retrieves a list of all characters that can be challenged to a battle.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing a list of characters.
 */
game.get('/characters', async (c) => {
    const db = c.env.DB;
    const characters = await db.prepare('SELECT id, gamertag, level, class FROM characters WHERE first_game_access_completed = TRUE').all();
    return c.json({ data: characters.results });
});

/**
 * Retrieves the detailed profile of the authenticated user's character, including stats and trophies.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the character's details.
 */
game.get('/character', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const character = await db.prepare(`
        SELECT c.*, t.wins, t.losses, t.kills, t.deaths
        FROM characters c
        JOIN trophies t ON c.id = t.character_id
        WHERE c.user_id = ?
    `).bind(user.id).first();

    if (!character) {
        return c.json({ error: 'Character not found.' }, 404);
    }

    return c.json({ data: character });
});

import { allocatePointsSchema } from '../shared/schemas/game';

/**
 * Allocates unspent stat points to a character's attributes (e.g., HP, ATK).
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response confirming the allocation or providing an error.
 */
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

/**
 * Creates a new battle between the authenticated user's character and another character.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the ID of the newly created battle.
 */
game.post('/battles', zValidator('json', createBattleSchema), async (c) => {
    const user = c.get('user');
    const { defenderId, mode } = c.req.valid('json');
    const db = c.env.DB;

    const attackerChar = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(user.id).first<{id: string}>();
    if (!attackerChar) {
        return c.json({ error: 'Attacker character not found.' }, 404);
    }

    if (attackerChar.id === defenderId) {
        return c.json({ error: "You can't battle yourself." }, 400);
    }

    const battleId = crypto.randomUUID();
    const seed = crypto.randomUUID();

    await db.prepare('INSERT INTO battles (id, attacker_char_id, defender_char_id, mode, state, seed) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(battleId, attackerChar.id, defenderId, mode, 'pending', seed)
        .run();

    return c.json({ data: { battleId } });
});

/**
 * Retrieves a list of all battles the authenticated user's character is involved in.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing a list of battles.
 */
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

/**
 * Retrieves the detailed state of a specific battle, including all turns taken.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the battle's state.
 */
game.get('/battles/:id', async (c) => {
    const battleId = c.req.param('id');
    const db = c.env.DB;

    const battle = await db.prepare('SELECT * FROM battles WHERE id = ?').bind(battleId).first();
    if (!battle) return c.json({ error: 'Battle not found' }, 404);

    const turns = await db.prepare('SELECT * FROM battle_turns WHERE battle_id = ? ORDER BY turn_index ASC').bind(battleId).all();

    // We could also join with character tables to get gamertags

    return c.json({ data: { ...battle, turns: turns.results } });
});

/**
 * Submits a turn for an ongoing battle. This is the core of the asynchronous battle system.
 * It resolves the turn's outcome, updates character stats, awards XP, and checks for level-ups.
 * @param {object} c The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the result of the turn.
 */
game.post('/battles/:id/turn', zValidator('json', submitTurnSchema), async (c) => {
    const user = c.get('user');
    const battleId = c.req.param('id');
    const db = c.env.DB;

    // This is a complex transaction, many things need to happen at once.
    // 1. Get battle and character data
    const battle = await db.prepare('SELECT * FROM battles WHERE id = ?').bind(battleId).first<BattleRow>();
    if (!battle) return c.json({ error: 'Battle not found' }, 404);
    if (battle.state === 'completed') return c.json({ error: 'Battle already completed' }, 400);

    const charQuery = 'SELECT id, hp, atk, def, class, xp, level FROM characters WHERE';
    const attackerChar = await db.prepare(`${charQuery} user_id = ?`).bind(user.id).first<CharacterRow>();
    if (!attackerChar) return c.json({ error: 'Attacker not found' }, 404);
    if (attackerChar.id !== battle.attacker_char_id) return c.json({ error: 'You are not the attacker in this battle' }, 403);

    const defenderChar = await db.prepare(`${charQuery} id = ?`).bind(battle.defender_char_id).first<CharacterRow>();
    if (!defenderChar) return c.json({ error: 'Defender not found' }, 404);

    const lastTurn = await db.prepare('SELECT turn_index FROM battle_turns WHERE battle_id = ? ORDER BY turn_index DESC LIMIT 1').bind(battleId).first<{turn_index: number}>();
    const currentTurnIndex = (lastTurn?.turn_index || 0) + 1;

    // 2. Resolve the turn
    const classMods: ClassMods = JSON.parse(c.env.CLASS_MODS);
    const mitigationFactor = parseFloat(c.env.MITIGATION_FACTOR);
    const turnResult = resolveTurn(attackerChar, defenderChar, classMods, `${battle.seed}${currentTurnIndex}`, mitigationFactor);

    // 3. Create D1 batch statements
    const turnId = crypto.randomUUID();
    const defenderHpAfter = defenderChar.hp - turnResult.damage;

    const statements = [
        // Log the turn
        db.prepare('INSERT INTO battle_turns (id, battle_id, turn_index, actor_char_id, action_type, damage, hp_after_target) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(turnId, battleId, currentTurnIndex, attackerChar.id, 'attack', turnResult.damage, defenderHpAfter),
        // Update defender's HP
        db.prepare('UPDATE characters SET hp = ? WHERE id = ?').bind(defenderHpAfter, defenderChar.id),
        // Update trophies (win/loss) per attack
        db.prepare('UPDATE trophies SET wins = wins + ?, losses = losses + ? WHERE character_id = ?')
            .bind(turnResult.attackerWins ? 1 : 0, turnResult.attackerWins ? 0 : 1, attackerChar.id),
        db.prepare('UPDATE trophies SET wins = wins + ?, losses = losses + ? WHERE character_id = ?')
            .bind(turnResult.defenderWins ? 1 : 0, turnResult.defenderWins ? 0 : 1, defenderChar.id),
        // Mark battle as started if this is the first turn
        db.prepare('UPDATE battles SET state = ?, started_at = COALESCE(started_at, ?) WHERE id = ? AND state = ?')
            .bind('active', new Date().toISOString(), battleId, 'pending'),
    ];

    // 4. Handle kill
    if (turnResult.killed) {
        const winXp = parseInt(c.env.WIN_XP_AWARD, 10);
        statements.push(
            // Update trophies (kill/death)
            db.prepare('UPDATE trophies SET kills = kills + 1 WHERE character_id = ?').bind(attackerChar.id),
            db.prepare('UPDATE trophies SET deaths = deaths + 1 WHERE character_id = ?').bind(defenderChar.id),
            // Award XP to winner
            db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').bind(winXp, attackerChar.id),
            // Mark battle as completed
            db.prepare('UPDATE battles SET state = ?, winner_char_id = ?, ended_at = ? WHERE id = ?')
                .bind('completed', attackerChar.id, new Date().toISOString(), battleId)
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

    // 5. Execute batch
    await db.batch(statements);

    return c.json({ data: turnResult });
});


export default game;
