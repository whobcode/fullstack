import { calculateUsableClanMembers, type CharacterBattleStats } from './storm8-battle-engine';

// Build a character's full battle stats (core + skill points + equipment + clan).
// Shared by the live attack endpoints and the autonomous bot loop.
export async function getCharacterBattleStats(db: D1Database, characterId: string): Promise<CharacterBattleStats | null> {
  const char = await db
    .prepare(`
      SELECT
        c.id, c.level, c.class,
        c.atk, c.def, c.spd,
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
      class: string;
      atk: number;
      def: number;
      spd: number;
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

  const clanCount = await db
    .prepare('SELECT COUNT(*) as total FROM clan_members WHERE character_id = ?')
    .bind(characterId)
    .first<{ total: number }>();

  const usableClanMembers = calculateUsableClanMembers(char.level, clanCount?.total || 0);

  // Best attack/defense ability per category (SQLite has no DISTINCT ON — GROUP BY).
  const attackAbilities = await db
    .prepare(`SELECT MAX(a.attack_value) AS attack_value FROM character_abilities ca JOIN abilities a ON ca.ability_id = a.id WHERE ca.character_id = ? GROUP BY a.category`)
    .bind(characterId)
    .all();
  const defenseAbilities = await db
    .prepare(`SELECT MAX(a.defense_value) AS defense_value FROM character_abilities ca JOIN abilities a ON ca.ability_id = a.id WHERE ca.character_id = ? GROUP BY a.category`)
    .bind(characterId)
    .all();

  const equipment_attack = (attackAbilities.results || []).reduce((sum: number, a: any) => sum + (a.attack_value || 0), 0);
  const equipment_defense = (defenseAbilities.results || []).reduce((sum: number, a: any) => sum + (a.defense_value || 0), 0);

  return {
    id: char.id,
    level: char.level,
    char_class: char.class,
    attack: char.atk || 0,
    defense: char.def || 0,
    speed: char.spd || 0,
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

// Increment a character's trophy counters (upsert so it works without a row).
export function bumpTrophies(
  db: D1Database,
  characterId: string,
  delta: { wins?: number; losses?: number; kills?: number; deaths?: number },
) {
  const w = delta.wins ?? 0;
  const l = delta.losses ?? 0;
  const k = delta.kills ?? 0;
  const d = delta.deaths ?? 0;
  return db
    .prepare(`
      INSERT INTO trophies (character_id, wins, losses, kills, deaths)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
        wins = wins + excluded.wins,
        losses = losses + excluded.losses,
        kills = kills + excluded.kills,
        deaths = deaths + excluded.deaths
    `)
    .bind(characterId, w, l, k, d);
}
