import type { Bindings } from '../bindings';
import { resolveBattle } from './storm8-battle-engine';
import { getCharacterBattleStats, bumpTrophies } from './battle';
import { performHitlistAttack } from './hitlist-claim';
import { canList, recordGlobalIfSaturated } from './hitlist';

// How many bot attacks to run per cron tick (keeps the game "alive" 24/7 while
// bounding DB growth).
const ATTACKS_PER_TICK = 15;

// Bounties claimed and posted per tick. Deliberately smaller than the attack
// batch: a claim is worth real currency and a posting spends it, so the world
// should churn rather than drain.
const HITLIST_CLAIMS_PER_TICK = 5;
const BOUNTIES_POSTED_PER_TICK = 3;

// What a bot puts on someone's head. The server floor is 1000.
const BOT_BOUNTY_MIN = 1000;
const BOT_BOUNTY_MAX = 5000;

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
    // Only while they are still up — a downed defender lets the attack through
    // to the real target, same rule as applyDefenseCharacter.
    const dc = await db
      .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ? AND current_health > 0')
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


// ---------------------------------------------------------------------------
// Hitlist
//
// Bots both hunt bounties and post them, against players and other bots alike,
// so the hitlist is not something only a human ever touches.
// ---------------------------------------------------------------------------

/** Bots claim bounties: pick open ones and send a bot after the target. */
export async function runBotHitlistClaims(env: Bindings): Promise<void> {
  const db = env.DB;

  const bounties = await db
    .prepare(`
      SELECT h.id, h.bounty_amount, h.target_character_id, h.posted_by_character_id, t.user_id AS target_user_id
      FROM hitlist h
      JOIN characters t ON t.id = h.target_character_id
      WHERE h.state = 'active' AND t.current_health > 0
      ORDER BY RANDOM() LIMIT ?
    `)
    .bind(HITLIST_CLAIMS_PER_TICK)
    .all<{ id: string; bounty_amount: number; target_character_id: string; posted_by_character_id: string; target_user_id: string }>();

  for (const b of bounties.results || []) {
    try {
      // A hunter that is not the target, not whoever posted it, and not on the
      // target's own account.
      const hunter = await db
        .prepare(`
          SELECT c.id FROM characters c JOIN users u ON u.id = c.user_id
          WHERE u.is_bot = 1
            AND c.current_health > 0 AND c.current_stamina >= 1
            AND c.id != ?1 AND c.id != ?2 AND c.user_id != ?3
          ORDER BY RANDOM() LIMIT 1
        `)
        .bind(b.target_character_id, b.posted_by_character_id, b.target_user_id)
        .first<{ id: string }>();
      if (!hunter) continue;

      const attacker = await getCharacterBattleStats(db, hunter.id);
      const defender = await getCharacterBattleStats(db, b.target_character_id);
      if (!attacker || !defender) continue;
      if (attacker.current_health <= 0 || defender.current_health <= 0 || attacker.current_stamina < 1) continue;

      await performHitlistAttack(db, { id: b.id, bounty_amount: b.bounty_amount }, attacker, defender);
    } catch (e) {
      console.error('Bot hitlist claim failed:', e);
    }
  }
}

/** Bots post bounties on whoever is worth hunting — players and bots alike. */
export async function runBotBounties(env: Bindings): Promise<void> {
  const db = env.DB;

  // Bots with enough on hand to cover the floor.
  const posters = await db
    .prepare(`
      SELECT c.id, c.user_id, c.unbanked_currency
      FROM characters c JOIN users u ON u.id = c.user_id
      WHERE u.is_bot = 1 AND c.unbanked_currency >= ?
      ORDER BY RANDOM() LIMIT ?
    `)
    .bind(BOT_BOUNTY_MIN, BOUNTIES_POSTED_PER_TICK)
    .all<{ id: string; user_id: string; unbanked_currency: number }>();

  for (const poster of posters.results || []) {
    try {
      // Any character but their own, bot or player. Globalled targets are
      // excluded here rather than waiting for canList to refuse them.
      const target = await db
        .prepare(`
          SELECT c.id FROM characters c
          WHERE c.first_game_access_completed = 1
            AND c.user_id != ?
            AND (c.globalled_until IS NULL OR c.globalled_until <= ?)
          ORDER BY RANDOM() LIMIT 1
        `)
        .bind(poster.user_id, new Date().toISOString())
        .first<{ id: string }>();
      if (!target) continue;

      // The same limits a player faces: 25 per poster per target, 200 total.
      const check = await canList(db, poster.id, target.id);
      if (!check.ok) continue;

      const amount = Math.min(
        poster.unbanked_currency,
        BOT_BOUNTY_MIN + Math.floor(Math.random() * (BOT_BOUNTY_MAX - BOT_BOUNTY_MIN + 1)),
      );

      await db.batch([
        db.prepare('INSERT INTO hitlist (id, target_character_id, posted_by_character_id, bounty_amount) VALUES (?, ?, ?, ?)')
          .bind(crypto.randomUUID(), target.id, poster.id, amount),
        db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
          .bind(amount, poster.id),
      ]);

      // A bot posting can be the listing that globals someone.
      await recordGlobalIfSaturated(db, target.id);
    } catch (e) {
      console.error('Bot bounty posting failed:', e);
    }
  }
}
