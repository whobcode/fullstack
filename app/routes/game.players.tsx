import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { Breadcrumb } from "../components/Breadcrumb";

type Player = {
  id: string;
  gamertag: string;
  class: string;
  level: number;
  owner: string;
  owner_id: string;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  globals: number;
  globalled_until: string | null;
  shade_avatar_url: string | null;
  defeated: number;
};

const PAGE = 40;

/**
 * The player directory: everyone in the game, searchable.
 *
 * Deliberately not a target list — the battle tab already does that, filtered
 * to who you can actually hit and backfilled as people fall. This one lists
 * everybody, defeated or not, and leads to profiles rather than offering
 * attacks, so it stays useful for looking someone up rather than for picking
 * a fight.
 */
export default function PlayersDirectoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"level" | "name">("level");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextOffset: number, query: string, order: string, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset), sort: order });
      if (query) params.set("q", query);
      const r = await apiClient.get<{ data: { players: Player[]; has_more: boolean; total: number } }>(
        `/game/directory?${params}`,
      );
      setPlayers((prev) => (append ? [...prev, ...(r.data.players || [])] : r.data.players || []));
      setHasMore(r.data.has_more);
      setTotal(r.data.total);
      setOffset(nextOffset);
    } catch (e: any) {
      setError(e?.message || "Could not load players");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(0, q, sort, false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, sort, load]);

  const isGloballed = (p: Player) =>
    !!p.globalled_until && new Date(p.globalled_until).getTime() > Date.now();

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <Breadcrumb items={[{ label: "Dashboard", to: "/shade/dashboard" }, { label: "Players" }]} />

      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold neon-text">Players</h1>
        <span className="text-[11px] text-shade-ash">{total.toLocaleString()} in the world</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search gamertag or player…"
          className="flex-1 min-w-[12rem] p-2 rounded bg-shade-black-950 border border-shade-red-800/50 text-shade-red-100 placeholder-shade-ash-dim focus:outline-none focus:ring-2 focus:ring-shade-red-500/40"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "level" | "name")}
          className="p-2 rounded bg-shade-black-950 border border-shade-red-800/50 text-shade-red-100"
        >
          <option value="level">Highest level</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <p className="text-[11px] text-shade-ash">
        Everyone in the game, including characters currently down. To pick a fight, use{" "}
        <Link to="/shade/battle" className="text-shade-red-400 hover:underline">Battle</Link>.
      </p>

      {error && <p className="text-shade-red-500 text-sm">{error}</p>}

      <div className="space-y-2">
        {players.map((p) => (
          <Link
            key={p.id}
            to={`/shade/u/${encodeURIComponent(p.gamertag)}`}
            className="flex items-center gap-3 rounded-lg p-3 bg-shade-black-950/60 border border-white/10 hover:border-shade-red-700/50 transition-all"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden silhouette-avatar flex items-center justify-center shrink-0">
              {p.shade_avatar_url
                ? <img src={p.shade_avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm neon-text">{p.gamertag?.charAt(0)?.toUpperCase()}</span>}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-shade-red-100 truncate">{p.gamertag}</span>
                {isGloballed(p) && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40">
                    ★ Globalled
                  </span>
                )}
                {!!p.defeated && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-shade-black-800 text-shade-ash border border-white/10">
                    down
                  </span>
                )}
              </div>
              <p className="text-[11px] text-shade-ash capitalize truncate">
                {p.class} · Lv.{p.level} · {p.owner}
              </p>
            </div>

            <div className="text-right shrink-0 text-[11px] leading-tight">
              <div className="text-emerald-300">{p.wins.toLocaleString()}W</div>
              <div className="text-fuchsia-300">{p.kills.toLocaleString()}K</div>
            </div>
          </Link>
        ))}

        {!loading && players.length === 0 && (
          <p className="text-shade-red-300 text-sm">No players match “{q}”.</p>
        )}
        {loading && <p className="text-shade-red-400 text-sm">Loading…</p>}
      </div>

      {hasMore && !loading && (
        <button
          onClick={() => load(offset + PAGE, q, sort, true)}
          className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-shade-black-800 border border-shade-red-800/50 text-shade-red-300 hover:text-shade-red-100 transition-all"
        >
          Load more
        </button>
      )}
    </div>
  );
}
