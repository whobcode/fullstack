import { calculateUsableClanMembers, type CharacterBattleStats } from './storm8-battle-engine';
import { BASE_STATS } from './classes';
import { statGainFromPoints } from './abilities';

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
        c.unbanked_currency,
        -- Equipment speed is flat: it decides initiative and multi-hit, and
        -- clan-multiplying it would let one item dominate every fight.
        COALESCE((
          SELECT SUM(ca.quantity * a.spd_value)
          FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
          WHERE ca.character_id = c.id AND a.kind = 'equipment'
        ), 0) AS equipment_speed,
        -- Attack and defence from abilities count as stat POINTS, not as
        -- equipment, so they are summed straight (quantity x value) rather than
        -- taking the best per category, and they are not clan-multiplied.
        COALESCE((
          SELECT SUM(ca.quantity * a.attack_value)
          FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
          WHERE ca.character_id = c.id AND a.kind = 'equipment'
        ), 0) AS ability_attack_points,
        COALESCE((
          SELECT SUM(ca.quantity * a.defense_value)
          FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
          WHERE ca.character_id = c.id AND a.kind = 'equipment'
        ), 0) AS ability_defense_points
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
      equipment_speed: number;
      ability_attack_points: number;
      ability_defense_points: number;
    }>();

  if (!char) return null;

  const clanCount = await db
    .prepare('SELECT COUNT(*) as total FROM clan_members WHERE character_id = ?')
    .bind(characterId)
    .first<{ total: number }>();

  const usableClanMembers = calculateUsableClanMembers(char.level, clanCount?.total || 0);

  // Best attack/defense ability per category (SQLite has no DISTINCT ON — GROUP BY).
  const attackAbilities = await db
    .prepare(`SELECT MAX(a.attack_value) AS attack_value FROM character_abilities ca JOIN abilities a ON ca.ability_id = a.id WHERE ca.character_id = ? AND a.kind = 'equipment' GROUP BY a.category`)
    .bind(characterId)
    .all();
  const defenseAbilities = await db
    .prepare(`SELECT MAX(a.defense_value) AS defense_value FROM character_abilities ca JOIN abilities a ON ca.ability_id = a.id WHERE ca.character_id = ? AND a.kind = 'equipment' GROUP BY a.category`)
    .bind(characterId)
    .all();

  // Retained for reference only. Attack and defence from abilities are stat
  // points now, so they must not also be counted as clan-multiplied equipment
  // — that would pay them twice.
  void attackAbilities;
  void defenseAbilities;
  const equipment_attack = 0;
  const equipment_defense = 0;

  const base = BASE_STATS[char.class as keyof typeof BASE_STATS] ?? BASE_STATS.phoenix;
  const abilityAttack = statGainFromPoints(char.ability_attack_points || 0, base.atk);
  const abilityDefense = statGainFromPoints(char.ability_defense_points || 0, base.def);

  return {
    id: char.id,
    level: char.level,
    char_class: char.class,
    attack: (char.atk || 0) + abilityAttack,
    defense: (char.def || 0) + abilityDefense,
    speed: (char.spd || 0) + (char.equipment_speed || 0),
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
  };
}

// Increment a character's trophy counters (upsert so it works without a row).
export function bumpTrophies(
  db: D1Database,
  characterId: string,
  delta: { wins?: number; losses?: number; kills?: number; deaths?: number; globals?: number },
) {
  const w = delta.wins ?? 0;
  const l = delta.losses ?? 0;
  const k = delta.kills ?? 0;
  const d = delta.deaths ?? 0;
  const g = delta.globals ?? 0;
  return db
    .prepare(`
      INSERT INTO trophies (character_id, wins, losses, kills, deaths, globals)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
        wins = wins + excluded.wins,
        losses = losses + excluded.losses,
        kills = kills + excluded.kills,
        deaths = deaths + excluded.deaths,
        globals = globals + excluded.globals
    `)
    .bind(characterId, w, l, k, d, g);
}
