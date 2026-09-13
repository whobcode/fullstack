import { resolveBattle, type CharacterBattleStats, type BattleResult } from './storm8-battle-engine';
import { bumpTrophies } from './battle';

/**
 * Resolve one attack on a bounty and persist everything it touches.
 *
 * Shared by the player endpoint and the bot loop. Duplicating it is how the
 * trophy gaps happened last time — the hitlist path recorded nothing unless
 * the attack killed, because it had drifted from the normal attack flow — so
 * there is exactly one implementation and both callers use it.
 *
 * Callers are responsible for the checks that differ between them: stamina,
 * ownership, whether the attacker posted this bounty, and target health. This
 * function assumes it has been cleared to run.
 */
export async function performHitlistAttack(
  db: D1Database,
  hitlist: { id: string; bounty_amount: number },
  attackerStats: CharacterBattleStats,
  defenderStats: CharacterBattleStats,
): Promise<BattleResult> {
  const seed = crypto.randomUUID();
  // Resolved like any other fight: the target strikes back.
  const result = resolveBattle(attackerStats, defenderStats, seed, {});
  const now = new Date().toISOString();

  const statements = [
    db.prepare('UPDATE characters SET current_stamina = current_stamina - 1 WHERE id = ?')
      .bind(attackerStats.id),

    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?')
      .bind(result.defender_health_after, defenderStats.id),

    // The attacker's health persists too, or hunting a bounty would be free.
    db.prepare('UPDATE characters SET current_health = ? WHERE id = ?')
      .bind(result.attacker_health_after, attackerStats.id),

    db.prepare('INSERT INTO hitlist_attacks (hitlist_id, attacker_character_id, damage_dealt, target_killed) VALUES (?, ?, ?, ?)')
      .bind(hitlist.id, attackerStats.id, result.damage_dealt, result.defender_killed),

    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(attackerStats.id, null, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
    db.prepare('INSERT INTO battle_feed (character_id, battle_id, attacker_id, defender_id, attacker_won, damage_dealt, currency_stolen) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(defenderStats.id, null, attackerStats.id, defenderStats.id, result.attacker_won, result.damage_dealt, result.currency_stolen),
  ];

  // A kill claims the bounty. The target stays at 0 health (defeated, and so
  // unattackable) until they heal, rather than respawning instantly.
  if (result.defender_killed) {
    statements.push(
      db.prepare("UPDATE hitlist SET state = 'claimed', claimed_at = ?, claimed_by_character_id = ? WHERE id = ?")
        .bind(now, attackerStats.id, hitlist.id),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
        .bind(hitlist.bounty_amount, attackerStats.id),
    );
  }

  // Trophies for every outcome, not only kills.
  if (result.defender_killed) {
    statements.push(
      bumpTrophies(db, attackerStats.id, { kills: 1, wins: 1 }),
      bumpTrophies(db, defenderStats.id, { deaths: 1, losses: 1 }),
    );
  } else if (result.attacker_killed) {
    statements.push(
      bumpTrophies(db, defenderStats.id, { kills: 1, wins: 1 }),
      bumpTrophies(db, attackerStats.id, { deaths: 1, losses: 1 }),
    );
  } else {
    statements.push(
      bumpTrophies(db, attackerStats.id, result.attacker_won ? { wins: 1 } : { losses: 1 }),
      bumpTrophies(db, defenderStats.id, result.attacker_won ? { losses: 1 } : { wins: 1 }),
    );
  }

  await db.batch(statements);
  return result;
}
