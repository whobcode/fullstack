import type { Bindings } from '../bindings';
import { resolveBattle } from './storm8-battle-engine';
import { getCharacterBattleStats, bumpTrophies } from './battle';

// How many bot attacks to run per cron tick (keeps the game "alive" 24/7 while
// bounding DB growth).
const ATTACKS_PER_TICK = 15;

// Pick a batch of bots and have each attack a real opponent, resolving the
// battle exactly like a player attack (initiative, multi-hit, counter, kills,
// trophies, currency). Called from the scheduled (cron) handler.
export async function runBotAttacks(env: Bindings): Promise<void> {
  const db = env.DB;

  // Bots that can act this tick: alive and have stamina.
  const bots = await db
    .prepare(`
      SELECT c.id, c.level
      FROM characters c JOIN users u ON u.id = c.user_id
      WHERE u.is_bot = 1
        AND c.current_health > 0 AND c.current_stamina >= 1
      ORDER BY RANDOM() LIMIT ?
    `)
    .bind(ATTACKS_PER_TICK)
    .all<{ id: string; level: number }>();

  for (const bot of bots.results || []) {
    try {
      await botAttackOnce(db, bot.id, bot.level);
    } catch (e) {
      console.error('Bot attack failed:', e);
    }
  }
}

async function botAttackOnce(db: D1Database, attackerId: string, attackerLevel: number): Promise<void> {
  // Pick a random living target at the attacker's level or higher (so bots
  // "punch up/sideways" and never farm lower-level players — same spirit as the
  // level-bracket rule).
  const target = await db
    .prepare(`
      SELECT c.id, c.user_id
      FROM characters c
      WHERE c.first_game_access_completed = 1 AND c.current_health > 0
        AND c.id != ? AND c.level >= ?
      ORDER BY RANDOM() LIMIT 1
    `)
    .bind(attackerId, attackerLevel)
    .first<{ id: string; user_id: string }>();
  if (!target) return;

  // Respect the target owner's designated defense character.
  let defenderId = target.id;
  const owner = await db
    .prepare('SELECT defense_character_id FROM users WHERE id = ?')
    .bind(target.user_id)
    .first<{ defense_character_id: string | null }>();
  if (owner?.defense_character_id) {
    const dc = await db
      .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
      .bind(owner.defense_character_id, target.user_id)
      .first<{ id: string }>();
    if (dc) defenderId = dc.id;
  }
  if (defenderId === attackerId) return;

  const attacker = await getCharacterBattleStats(db, attackerId);
  const defender = await getCharacterBattleStats(db, defenderId);
  if (!attacker || !defender) return;
  if (attacker.current_health <= 0 || defender.current_health <= 0 || attacker.current_stamina < 1) return;

  const seed = crypto.randomUUID();
  const result = resolveBattle(attacker, defender, seed, {}, false, true);

  const battleId = crypto.randomUUID();
  const now = new Date().toISOString();

  const statements = [
    db.prepare('UPDATE characters SET current_stamina = current_stamina - 1 WHERE id = ?').bind(attacker.id),
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?').bind(result.defender_health_after, defender.id),
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?').bind(result.attacker_health_after, attacker.id),
    db.prepare(`
      INSERT INTO battles (id, attacker_char_id, defender_char_id, mode, state, seed, battle_type, started_at, ended_at, winner_char_id, currency_stolen, defender_health_after)
      VALUES (?, ?, ?, 'async', 'completed', ?, 'normal', ?, ?, ?, ?, ?)
    `).bind(battleId, attacker.id, defender.id, seed, now, now, result.attacker_won ? attacker.id : defender.id, result.currency_stolen, result.defender_health_after),
  ];

  if (result.currency_stolen > 0) {
    statements.push(
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?').bind(result.currency_stolen, attacker.id),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?').bind(result.currency_stolen, defender.id),
    );
  }

  if (result.defender_killed) {
    statements.push(bumpTrophies(db, attacker.id, { kills: 1, wins: 1 }), bumpTrophies(db, defender.id, { deaths: 1, losses: 1 }));
  } else if (result.attacker_killed) {
    statements.push(bumpTrophies(db, defender.id, { kills: 1, wins: 1 }), bumpTrophies(db, attacker.id, { deaths: 1, losses: 1 }));
  } else {
    statements.push(
      bumpTrophies(db, attacker.id, result.attacker_won ? { wins: 1 } : { losses: 1 }),
      bumpTrophies(db, defender.id, result.attacker_won ? { losses: 1 } : { wins: 1 }),
    );
  }

  statements.push(
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(attacker.id, battleId, attacker.id, defender.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(defender.id, battleId, attacker.id, defender.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
  );

  await db.batch(statements);
}
