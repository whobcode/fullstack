import { useCallback, useEffect, useState } from "react";
import { apiClient } from "./api";

export type StatRow = {
  label: string;
  base: number;
  allocated: number;
  ability: number;
  /** Added by the max-level bonus. Always 0 for SPD, which it does not touch. */
  bonus: number;
  total: number;
};

export type Breakdown = {
  character_id: string;
  level: number;
  clan_multiplier: number;
  /** How many of the owner's characters are level 300. */
  max_level_characters: number;
  /** 1 + 1.0 per level-300 character, applied to ATK/HP/DEF. */
  max_level_multiplier: number;
  stats: StatRow[];
  attack_power: number;
  defense_power: number;
};

/**
 * Stat breakdowns for every character the player owns, keyed by character id.
 *
 * Anything showing stats needs this rather than characters.atk/def/spd:
 * equipment attack, defence and speed are applied at battle time and never
 * written to the character row, so reading the columns directly shows numbers
 * from before any ability was bought.
 *
 * One request covers the whole list, so a profile or dashboard does not fan out
 * per character.
 */
export function useStatBreakdowns(enabled = true) {
  const [breakdowns, setBreakdowns] = useState<Record<string, Breakdown>>({});
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await apiClient.get<{ data: Record<string, Breakdown> }>("/storm8/stats-breakdown/all");
      setBreakdowns(r.data || {});
    } catch {
      // Leave the caller to fall back to the raw columns.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);

  return { breakdowns, loading, refresh: load };
}

/** One stat's total for a character, falling back to a raw value. */
export function statTotal(
  breakdowns: Record<string, Breakdown>,
  characterId: string | null | undefined,
  label: string,
  fallback: number,
): number {
  if (!characterId) return fallback;
  const row = breakdowns[characterId]?.stats.find((s) => s.label === label);
  return row ? row.total : fallback;
}

/** The share of a stat that comes from abilities, for showing it separately. */
export function statFromAbilities(
  breakdowns: Record<string, Breakdown>,
  characterId: string | null | undefined,
  label: string,
): number {
  if (!characterId) return 0;
  return breakdowns[characterId]?.stats.find((s) => s.label === label)?.ability ?? 0;
}
