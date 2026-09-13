import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiClient } from "../lib/api";

type FeedEntry = {
  id: string;
  attacker_gamertag: string;
  defender_gamertag: string;
  attacker_won: number | boolean;
  damage_dealt: number;
  currency_stolen: number;
  created_at: string;
};

/**
 * One character's battle feed. Every character keeps its own — attacks it made
 * and attacks made against it, bounty claims included.
 */
export function CharacterFeed({ gamertag }: { gamertag: string }) {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gamertag) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiClient.get<{ data: FeedEntry[] }>(
          `/game/character/${encodeURIComponent(gamertag)}/feed`,
        );
        if (!cancelled) setFeed(r.data || []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamertag]);

  const tag = (name: string) => (
    <Link to={`/shade/u/${encodeURIComponent(name)}`} className="font-semibold text-shade-red-300 hover:underline">
      {name}
    </Link>
  );

  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50">
      <h2 className="text-lg font-bold neon-text mb-3">Battle Feed</h2>

      {loading ? (
        <p className="text-shade-red-400 text-sm">Loading…</p>
      ) : feed.length === 0 ? (
        <p className="text-shade-red-400 text-sm">No battles yet.</p>
      ) : (
        <div className="space-y-2">
          {feed.map((f) => {
            const attackerWon = !!f.attacker_won;
            const isAttacker = f.attacker_gamertag.toLowerCase() === gamertag.toLowerCase();
            // "Won" from this character's point of view, not the attacker's.
            const good = isAttacker ? attackerWon : !attackerWon;

            return (
              <div key={f.id} className="p-3 rounded-lg bg-shade-black-950/60 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-shade-red-100">
                    {tag(f.attacker_gamertag)}
                    <span className="text-shade-red-400"> attacked </span>
                    {tag(f.defender_gamertag)}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      good ? "text-emerald-300" : "text-shade-red-400"
                    }`}
                  >
                    {good ? "Won" : "Lost"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-shade-ash">
                    {f.damage_dealt.toLocaleString()} damage
                    {f.currency_stolen > 0 && ` · ${f.currency_stolen.toLocaleString()} stolen`}
                  </span>
                  <span className="text-[10px] text-shade-ash-dim">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
