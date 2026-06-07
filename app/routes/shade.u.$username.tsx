import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../lib/api";

type PublicChar = {
  gamertag: string;
  class: string;
  level: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
};

type PublicProfile = {
  username: string;
  shade_avatar_url: string | null;
  created_at: string | null;
};

// Public profile: trophies only. Combat stats are private to the owner.
export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [characters, setCharacters] = useState<PublicChar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    apiClient.get<{ data: { profile: PublicProfile; characters: PublicChar[] } }>(`/game/profile/${encodeURIComponent(username)}`)
      .then((r) => { setProfile(r.data.profile); setCharacters(r.data.characters || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="neon-text p-6">Loading profile…</div>;
  if (error) return <div className="text-shade-red-500 p-6">{error}</div>;
  if (!profile) return null;

  const avatar = profile.shade_avatar_url;
  const totalWins = characters.reduce((s, c) => s + (c.wins ?? 0), 0);
  const totalKills = characters.reduce((s, c) => s + (c.kills ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60">
        <div className="w-24 h-24 rounded-full overflow-hidden silhouette-avatar breathing-glow flex items-center justify-center shrink-0">
          {avatar ? (
            <img src={avatar} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl neon-text">{profile.username?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-shade-red-400 via-fuchsia-400 to-shade-red-600 bg-clip-text text-transparent">{profile.username}</h1>
          <p className="text-shade-red-300 text-sm mt-1">
            {characters.length} character{characters.length === 1 ? "" : "s"} • {totalWins.toLocaleString()} wins • {totalKills.toLocaleString()} kills
          </p>
          <Link to="/shade/leaderboard" className="text-xs text-shade-red-400 hover:text-shade-red-200 mt-3 inline-block">← Leaderboard</Link>
        </div>
      </div>

      {/* Characters — trophies only */}
      <div>
        <h2 className="text-lg font-bold neon-text mb-3">Characters</h2>
        {characters.length === 0 ? (
          <div className="rounded-xl p-6 text-center bg-gradient-to-br from-shade-black-800 to-black border border-shade-red-800/50 text-shade-red-300">
            No characters yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold neon-text">{c.gamertag || "Unnamed"}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-shade-red-900/40 text-shade-red-200 border border-shade-red-700/50 capitalize">{c.class} • Lv.{c.level}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Wins", val: c.wins, col: "text-emerald-300" },
                    { label: "Losses", val: c.losses, col: "text-shade-red-300" },
                    { label: "Kills", val: c.kills, col: "text-fuchsia-300" },
                    { label: "Deaths", val: c.deaths, col: "text-sky-300" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg p-2 bg-shade-black-950/60 border border-white/10">
                      <div className="text-[10px] uppercase tracking-wider text-shade-red-400">{s.label}</div>
                      <div className={`text-lg font-bold ${s.col}`}>{s.val ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-shade-red-500/70 mt-4 text-center">Combat stats are private — only the owner can see them.</p>
      </div>
    </div>
  );
}
