import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../lib/api";
import { useActiveCharacter } from "../lib/ActiveCharacterContext";
import { CharacterFeed } from "../components/CharacterFeed";
import { ProfileComments } from "../components/ProfileComments";
import { ClanPanel } from "../components/ClanPanel";
import { Breadcrumb } from "../components/Breadcrumb";
import { CharacterAvatar, GenerateAvatarButton } from "../components/CharacterAvatar";

type StatRow = { label: string; base: number; allocated: number; ability: number; total: number };
type Breakdown = {
  character_id: string;
  level: number;
  clan_multiplier: number;
  stats: StatRow[];
  attack_power: number;
  defense_power: number;
};

const STATS = ["hp", "atk", "def", "spd"] as const;
type StatKey = (typeof STATS)[number];

/**
 * One character's sheet: what they are, where every stat number comes from,
 * and the controls that only apply to them.
 *
 * Stat values are split three ways — class base, what skill points bought, and
 * what abilities add — each in its own colour, so it is obvious which part of
 * a number the player controls. Battle feed and comment wall are per character
 * and live here rather than on the shared dashboard.
 */
export default function CharacterDetailPage() {
  const { id } = useParams();
  const { characters, refresh } = useActiveCharacter();
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [alloc, setAlloc] = useState<Record<StatKey, number>>({ hp: 0, atk: 0, def: 0, spd: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshAvatar, setFreshAvatar] = useState<string | null>(null);

  const character = characters.find((c: any) => c.id === id);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await apiClient.get<{ data: Breakdown }>(`/storm8/stats-breakdown?character_id=${encodeURIComponent(id)}`);
      setBreakdown(r.data);
    } catch (e: any) {
      setError(e?.message || "Could not load stats");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const spending = STATS.reduce((n, k) => n + (alloc[k] || 0), 0);
  const unspent = character?.unspent_stat_points ?? 0;
  const remaining = unspent - spending;

  const bump = (k: StatKey, by: number) =>
    setAlloc((a) => {
      const next = Math.max(0, (a[k] || 0) + by);
      const others = STATS.reduce((n, s) => n + (s === k ? 0 : a[s] || 0), 0);
      return { ...a, [k]: Math.min(next, unspent - others) };
    });

  const commit = async () => {
    if (spending <= 0) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await apiClient.post("/game/character/allocate-points", { characterId: id, ...alloc });
      setAlloc({ hp: 0, atk: 0, def: 0, spd: 0 });
      setNotice("Points allocated.");
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      setError(e?.message || "Allocation failed");
    } finally {
      setBusy(false);
    }
  };

  const respec = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await apiClient.post("/game/character/respec", { characterId: id });
      setAlloc({ hp: 0, atk: 0, def: 0, spd: 0 });
      setNotice("Points refunded. Abilities are untouched.");
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      setError(e?.message || "Respec failed");
    } finally {
      setBusy(false);
    }
  };

  if (!character) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Breadcrumb items={[{ label: "Dashboard", to: "/shade/dashboard" }, { label: "Character" }]} />
        <p className="text-shade-red-300 mt-2">Character not found.</p>
      </div>
    );
  }

  // Freshly generated wins until the context refetches; then the stored one.
  const avatar = freshAvatar ?? character.shade_avatar_url;
  const perPoint: Record<StatKey, string> = {
    hp: "+100 max health",
    atk: "+1% of base attack",
    def: "+1% of base defense",
    spd: "+2 speed",
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      {/* Your own character: the dashboard is where you came from. */}
      <Breadcrumb items={[{ label: "Dashboard", to: "/shade/dashboard" }, { label: character.gamertag || "Character" }]} />

      {/* Identity beside the numbers, as one unit. */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col items-center gap-2 self-center sm:self-start">
            <CharacterAvatar src={avatar} name={character.gamertag} size="lg" />
            <GenerateAvatarButton
              characterId={character.id}
              onGenerated={(url) => { setFreshAvatar(url); refresh(); }}
              label={avatar ? "Regenerate" : "Generate avatar"}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold neon-text truncate">{character.gamertag}</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-shade-red-900/40 text-shade-red-200 border border-shade-red-700/50 capitalize">
                {character.class} · Lv.{character.level}
              </span>
            </div>

            {/* Legend: the colours used throughout the sheet. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-3">
              <span className="text-shade-ash">base</span>
              <span className="text-sky-300">skill points</span>
              <span className="text-amber-300">abilities</span>
              <span className="text-shade-red-100 font-bold">total</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(breakdown?.stats ?? []).map((s) => (
                <div key={s.label} className="rounded-lg p-3 bg-shade-black-950/60 border border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-shade-red-400 mb-1">{s.label}</div>
                  <div className="text-xl font-bold text-shade-red-100">{s.total.toLocaleString()}</div>
                  <div className="text-[11px] mt-1 flex flex-wrap gap-x-2">
                    <span className="text-shade-ash">{s.base.toLocaleString()}</span>
                    {s.allocated > 0 && <span className="text-sky-300">+{s.allocated.toLocaleString()}</span>}
                    {s.ability > 0 && <span className="text-amber-300">+{s.ability.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>

            {breakdown && (
              <p className="text-[11px] text-shade-ash mt-2">
                Battle power — attack <span className="text-shade-red-200">{breakdown.attack_power.toLocaleString()}</span>,
                defense <span className="text-shade-red-200">{breakdown.defense_power.toLocaleString()}</span>
                {breakdown.clan_multiplier > 1 && <> · equipment ×{breakdown.clan_multiplier} from clan</>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Allocation: one compact row per stat rather than a stacked card each. */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-shade-black-800 to-shade-black-900 border border-shade-red-800/50">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-lg font-bold neon-text">Skill Points</h2>
          <span className="text-sm text-shade-red-200">
            {remaining.toLocaleString()} <span className="text-shade-ash">unspent</span>
          </span>
        </div>

        {unspent === 0 ? (
          <p className="text-sm text-shade-ash">No unspent points. You earn 5 per level, and 5 more every 5th.</p>
        ) : (
          <div className="space-y-1.5">
            {STATS.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-10 text-xs uppercase tracking-wider text-shade-red-400">{k}</span>
                <span className="flex-1 text-[11px] text-shade-ash truncate">{perPoint[k]}</span>
                <button onClick={() => bump(k, -1)} disabled={!alloc[k]}
                  className="w-7 h-7 rounded bg-shade-black-950 border border-shade-red-800/50 text-shade-red-300 disabled:opacity-40">−</button>
                <span className="w-10 text-center text-sm font-bold text-sky-300">{alloc[k] || 0}</span>
                <button onClick={() => bump(k, 1)} disabled={remaining <= 0}
                  className="w-7 h-7 rounded bg-shade-black-950 border border-shade-red-800/50 text-shade-red-300 disabled:opacity-40">+</button>
                <button onClick={() => bump(k, 10)} disabled={remaining <= 0}
                  className="px-2 h-7 rounded bg-shade-black-950 border border-shade-red-800/50 text-[11px] text-shade-red-300 disabled:opacity-40">+10</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={commit} disabled={busy || spending <= 0}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white disabled:opacity-50">
            {spending > 0 ? `Spend ${spending}` : "Spend"}
          </button>
          <button onClick={respec} disabled={busy}
            className="px-3 py-2 rounded-lg text-sm bg-shade-black-950 border border-shade-red-700/60 text-shade-red-300 hover:text-shade-red-100 disabled:opacity-50">
            ↺ Reset
          </button>
        </div>

        {notice && <p className="text-emerald-300 text-xs mt-2">{notice}</p>}
        {error && <p className="text-shade-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Clan size multiplies this character's equipment in battle. */}
      <ClanPanel characterId={character.id} onUpdate={() => { load(); refresh(); }} />

      {/* Both are per character, so they belong on the character, not the account. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {character.gamertag && <CharacterFeed gamertag={character.gamertag} />}
        {character.gamertag && <ProfileComments gamertag={character.gamertag} />}
      </div>
    </div>
  );
}
