/**
 * Character classes and base stats — shared by the game API and the signup flow
 * so a playable character can be created the moment a user registers.
 */
import { MAX_LEVEL, getTotalStatPointsForLevel } from './leveling';

export const CHARACTER_CLASSES = ['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies'] as const;
export type CharacterClass = (typeof CHARACTER_CLASSES)[number];

export interface BaseStats { hp: number; atk: number; def: number; mp: number; spd: number; }

export const BASE_STATS: Record<CharacterClass, BaseStats> = {
  phoenix:  { hp: 10000, atk: 1000, def: 500,  mp: 175, spd: 100 },
  dphoenix: { hp: 10000, atk: 1750, def: 375,  mp: 150, spd: 150 },
  dragon:   { hp: 10000, atk: 750,  def: 1100, mp: 100, spd: 175 },
  ddragon:  { hp: 10000, atk: 1000, def: 1000, mp: 200, spd: 75  },
  kies:     { hp: 15000, atk: 750,  def: 750,  mp: 225, spd: 150 },
};

/** Deterministically pick a starter class from a seed (stable per user, gives variety across signups). */
export function defaultClassFor(seed: string): CharacterClass {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return CHARACTER_CLASSES[h % CHARACTER_CLASSES.length];
}

export interface InitialCharacter extends BaseStats {
  cls: CharacterClass; level: number; xp: number; unspentStatPoints: number;
}

/** Compute the starting field values for a brand-new character. */
export function rollInitialCharacter(opts: { seed: string; cls?: CharacterClass; autoMax?: boolean }): InitialCharacter {
  const cls = opts.cls ?? defaultClassFor(opts.seed);
  const s = BASE_STATS[cls];
  const level = opts.autoMax ? MAX_LEVEL : 1;
  const xp = opts.autoMax ? 999_999_999 : 0;
  const unspentStatPoints = opts.autoMax ? getTotalStatPointsForLevel(MAX_LEVEL) : 0;
  return { cls, level, xp, unspentStatPoints, ...s };
}

/** Sanitize a social username into a valid gamertag candidate (3–20 chars, [A-Za-z0-9_.-]). */
export function sanitizeGamertag(raw: string): string {
  let t = (raw || '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 20);
  while (t.length < 3) t += '0';
  return t;
}
