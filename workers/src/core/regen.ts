import { calculateRegeneration } from './storm8-battle-engine';

// Health regenerates 2% of max per minute (≈50 min from 0 to full), so a
// defeated character recovers over time without needing the hospital.
const HEALTH_REGEN_PCT_PER_MIN = 0.02;

type RegenRow = {
  current_energy: number;
  max_energy: number;
  last_energy_regen: string | null;
  current_stamina: number;
  max_stamina: number;
  last_stamina_regen: string | null;
  current_health: number;
  max_health: number;
  last_health_regen: string | null;
};

// Bring a single character's time-based resources (energy, stamina, health)
// up to date. Lazy: safe to call on read or from the cron.
export async function applyResourceRegeneration(db: D1Database, characterId: string): Promise<void> {
  const char = await db
    .prepare(`
      SELECT
        current_energy, max_energy, last_energy_regen,
        current_stamina, max_stamina, last_stamina_regen,
        current_health, max_health, last_health_regen
      FROM characters WHERE id = ?
    `)
    .bind(characterId)
    .first<RegenRow>();
  if (!char) return;

  const nowIso = new Date().toISOString();

  // Energy: +1 per 5 min. Stamina: +1 per 3 min.
  const energyRegen = calculateRegeneration(char.last_energy_regen || nowIso, char.current_energy, char.max_energy, 5);
  const staminaRegen = calculateRegeneration(char.last_stamina_regen || nowIso, char.current_stamina, char.max_stamina, 3);

  // Health: percentage of max per minute (works from 0, i.e. revives the defeated).
  let newHealth = char.current_health;
  let newHealthTs = char.last_health_regen || nowIso;
  if (char.current_health >= char.max_health) {
    newHealth = char.max_health;
    newHealthTs = nowIso; // keep fresh while at full so it doesn't over-accrue later
  } else {
    const minutes = (Date.now() - new Date(char.last_health_regen || nowIso).getTime()) / 60000;
    const regen = Math.floor(char.max_health * HEALTH_REGEN_PCT_PER_MIN * minutes);
    if (regen > 0) {
      newHealth = Math.min(char.max_health, char.current_health + regen);
      newHealthTs = nowIso;
    }
  }

  await db
    .prepare(`
      UPDATE characters SET
        current_energy = ?, last_energy_regen = ?,
        current_stamina = ?, last_stamina_regen = ?,
        current_health = ?, last_health_regen = ?
      WHERE id = ?
    `)
    .bind(
      energyRegen.newAmount, energyRegen.newTimestamp,
      staminaRegen.newAmount, staminaRegen.newTimestamp,
      newHealth, newHealthTs,
      characterId,
    )
    .run();
}

// Regenerate all of a user's characters (used on read so displayed values are live).
export async function regenUserCharacters(db: D1Database, userId: string): Promise<void> {
  const rows = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(userId).all<{ id: string }>();
  for (const r of rows.results || []) {
    await applyResourceRegeneration(db, r.id);
  }
}
