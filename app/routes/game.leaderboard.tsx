import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";

type Row = {
  id: string;
  gamertag: string;
  class: string;
  level: number;
  owner: string;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
};

const RANK_STYLE = [
  "from-amber-500/40 to-amber-900/10 border-amber-400/50 text-amber-200",   // 1st – gold
  "from-slate-300/30 to-slate-700/10 border-slate-300/40 text-slate-200",   // 2nd – silver
  "from-orange-700/40 to-orange-950/10 border-orange-600/50 text-orange-200", // 3rd – bronze
];

export default function GameLeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ data: Row[] }>("/game/leaderboard")
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-extrabold mb-1 bg-gradient-to-r from-amber-300 via-shade-red-400 to-fuchsia-400 bg-clip-text text-transparent tracking-wide">
        🏆 Leaderboard
      </h1>
      <p className="text-sm text-shade-red-300 mb-5">Top fighters by level, wins, and kills.</p>

      {loading && <p className="neon-text">Loading rankings…</p>}
      {error && <p className="text-shade-red-500">{error}</p>}
      {!loading && rows.length === 0 && (
        <div className="rounded-xl p-8 text-center bg-gradient-to-br from-shade-black-800 to-black border border-shade-red-800/50 text-shade-red-300">
          No ranked fighters yet — be the first to climb.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`flex items-center gap-4 rounded-xl p-3 border bg-gradient-to-r ${
              i < 3 ? RANK_STYLE[i] : "from-shade-black-800 to-shade-black-900 border-white/10 text-shade-red-100"
            }`}
          >
            <div className="w-9 text-center text-xl font-extrabold">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/shade/u/${encodeURIComponent(r.owner)}`} className="font-bold truncate hover:underline block">{r.gamertag}</Link>
              <div className="text-xs opacity-70 capitalize">{r.class} • Lv.{r.level}</div>
            </div>
            <div className="flex gap-3 text-center text-xs">
              <div><div className="font-bold text-emerald-300">{r.wins}</div><div className="opacity-60">W</div></div>
              <div><div className="font-bold text-shade-red-300">{r.losses}</div><div className="opacity-60">L</div></div>
              <div><div className="font-bold text-fuchsia-300">{r.kills}</div><div className="opacity-60">K</div></div>
              <div><div className="font-bold text-sky-300">{r.deaths}</div><div className="opacity-60">D</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
