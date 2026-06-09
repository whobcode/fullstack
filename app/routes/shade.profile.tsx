import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useActiveCharacter } from "../lib/ActiveCharacterContext";
import { ProfileComments } from "../components/ProfileComments";

type GamerCharacter = {
  id: string;
  slot_number: number;
  gamertag: string | null;
  class: string | null;
  level: number;
  xp: number;
  hp: number;
  atk: number;
  def: number;
  mp: number;
  spd: number;
  unspent_stat_points: number;
  first_game_access_completed: boolean;
  wins: number | null;
  losses: number | null;
  kills: number | null;
  deaths: number | null;
};

type GamerProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  shade_avatar_url: string | null;
  created_at: string | null;
};

const STAT_KEYS: { key: keyof GamerCharacter; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
];

function CharacterPanel({ char }: { char: GamerCharacter }) {
  const winRate = (() => {
    const w = char.wins ?? 0;
    const l = char.losses ?? 0;
    const total = w + l;
    return total === 0 ? "—" : `${Math.round((w / total) * 100)}%`;
  })();

  return (
    <div className="rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-shade-red-400">Slot {char.slot_number}</div>
          <h3 className="text-xl font-bold neon-text">{char.gamertag || "Unnamed"}</h3>
          <div className="text-sm text-shade-red-300">
            {char.class ? `${char.class} • Lv.${char.level}` : "Setup incomplete"}
          </div>
        </div>
        {char.unspent_stat_points > 0 && (
          <Link
            to="/shade/dashboard"
            className="text-xs px-3 py-1 bg-shade-black-900 neon-border text-shade-red-500 rounded hover:neon-glow transition-all"
            title="Allocate unspent points"
          >
            {char.unspent_stat_points.toLocaleString()} unspent →
          </Link>
        )}
      </div>

      <div className="mb-3">
        <div className="text-xs text-shade-red-400 mb-1">
          {char.xp.toLocaleString()} XP
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {STAT_KEYS.map(({ key, label }) => (
          <div key={label} className="text-center bg-shade-black-800 rounded p-2">
            <div className="text-[10px] uppercase text-shade-red-400">{label}</div>
            <div className="text-shade-red-100 font-semibold">
              {(char[key] as number).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase text-shade-red-400">Wins</div>
          <div className="text-shade-red-100">{char.wins ?? 0}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-shade-red-400">Losses</div>
          <div className="text-shade-red-100">{char.losses ?? 0}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-shade-red-400">Kills</div>
          <div className="text-shade-red-100">{char.kills ?? 0}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-shade-red-400">W/L</div>
          <div className="text-shade-red-100">{winRate}</div>
        </div>
      </div>
    </div>
  );
}

export default function GamerProfilePage() {
  const { isAuthenticated, refreshUser, user } = useAuth();
  const [profile, setProfile] = useState<GamerProfile | null>(null);
  const { activeId, setActive } = useActiveCharacter();
  const [characters, setCharacters] = useState<GamerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient.get<{ data: { profile: GamerProfile; characters: GamerCharacter[] } }>(
        "/game/profile"
      );
      setProfile(res.data.profile);
      setCharacters(res.data.characters || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      load();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const regenerateAvatar = async () => {
    setGenerating(true);
    setError(null);
    try {
      await apiClient.post("/ai/shade-avatar", {});
      await Promise.all([load(), refreshUser()]);
    } catch (err: any) {
      setError(err?.message || "Failed to generate avatar");
    } finally {
      setGenerating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-shade-red-300 mb-4">Log in to view your gamer profile.</p>
        <Link to="/login" className="bg-shade-black-900 neon-border text-shade-red-600 px-6 py-2 rounded hover:neon-glow transition-all">
          Login
        </Link>
      </div>
    );
  }

  if (loading) return <div className="neon-text p-6">Loading profile…</div>;

  const avatarSrc = profile?.shade_avatar_url || profile?.avatar_url || null;
  const completedChars = characters.filter((c) => c.first_game_access_completed);
  const topLevel = completedChars.reduce((max, c) => Math.max(max, c.level), 0);
  const totalWins = completedChars.reduce((sum, c) => sum + (c.wins ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Profile header */}
      <div className="rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50 p-6 flex flex-col sm:flex-row items-center gap-6 shadow-[0_0_25px_rgba(255,42,42,0.12)]">
        <div className="w-28 h-28 rounded-full overflow-hidden silhouette-avatar breathing-glow flex items-center justify-center shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Shade avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl neon-text">{profile?.username?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold neon-text-strong">{profile?.username}</h1>
          <p className="text-shade-red-300 text-sm mt-1">
            {completedChars.length} character{completedChars.length === 1 ? "" : "s"} • Top level {topLevel || "—"} • {totalWins.toLocaleString()} total wins
          </p>
          {(() => {
            const defender = characters.find((c) => c.id === user?.defense_character_id);
            return defender ? (
              <p className="text-sm text-sky-300 mt-1">🛡️ Defender: <span className="font-bold">{defender.gamertag}</span></p>
            ) : null;
          })()}
          {completedChars.length > 0 && (
            <div className="flex items-center gap-2 justify-center sm:justify-start mt-3">
              <span className="text-xs text-shade-red-300">Playing as:</span>
              <select
                value={activeId ?? ''}
                onChange={(e) => setActive(e.target.value)}
                className="text-sm p-1.5 rounded bg-shade-black-600 neon-border text-shade-red-100"
              >
                {completedChars.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.gamertag} (Lv.{ch.level} {ch.class})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 justify-center sm:justify-start mt-4">
            <button
              onClick={regenerateAvatar}
              disabled={generating}
              className="text-xs px-3 py-1.5 bg-shade-black-800 neon-border text-shade-red-400 rounded hover:neon-glow transition-all disabled:opacity-50"
            >
              {generating ? "Generating…" : avatarSrc ? "Regenerate Avatar" : "Generate Avatar"}
            </button>
            <Link
              to="/shade/dashboard"
              className="text-xs px-3 py-1.5 bg-shade-black-900 neon-border text-shade-red-500 rounded hover:neon-glow transition-all"
            >
              Dashboard
            </Link>
            <Link
              to="/profile/me"
              className="text-xs px-3 py-1.5 bg-shade-black-800 border border-social-green-600/50 text-social-green-300 rounded hover:border-social-green-400 hover:text-social-green-200 transition-all"
            >
              Social profile
            </Link>
          </div>
        </div>
      </div>

      {error && <p className="text-shade-red-500 text-sm">{error}</p>}

      {/* Characters */}
      <div>
        <h2 className="text-lg font-bold neon-text mb-3">Characters</h2>
        {completedChars.length === 0 ? (
          <div className="rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50 p-6 text-center text-shade-red-300">
            No characters yet.{" "}
            <Link to="/shade/dashboard" className="neon-text underline">
              Create one
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedChars.map((char) => (
              <button
                key={char.id}
                onClick={() => setActive(char.id)}
                className={`text-left rounded-xl transition-all ${char.id === activeId ? 'ring-2 ring-shade-red-500 shadow-[0_0_18px_rgba(255,42,42,0.35)]' : 'opacity-90 hover:opacity-100'}`}
                title="Play as this character"
              >
                {char.id === activeId && (
                  <div className="text-[10px] font-bold text-shade-red-300 px-2 pt-1">▶ PLAYING AS</div>
                )}
                <CharacterPanel char={char} />
              </button>
            ))}
          </div>
        )}
      </div>

      {profile?.username && <ProfileComments name={profile.username} />}
    </div>
  );
}
