import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function MyProfilePage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ data: { username: string; avatar_url?: string; bio?: string } }>("/users/me");
        setUsername(res.data.username);
        setAvatarUrl(res.data.avatar_url ?? "");
        setBio(res.data.bio ?? "");
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await apiClient.put("/users/me", { username, bio, avatar_url: avatarUrl });
      if (user) {
        login({ ...user, username });
      }
      setStatus("Saved");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const needsUsername = username.startsWith("fb_");

  return (
    <div className="space-y-4">
      <header className="rounded-3xl beveled-panel p-6 shadow neon-glow">
        <p className="text-xs uppercase tracking-wide text-shade-red-600">Your Shade Profile</p>
        <h1 className="text-3xl font-bold neon-text">My Shade</h1>
        {needsUsername && (
          <p className="mt-2 text-sm text-shade-red-300">Pick a custom username to replace the temporary Facebook one.</p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl beveled-panel p-5 shadow">
        <div>
          <label className="block text-sm text-shade-red-200 mb-1">Username</label>
          <input
            className="w-full rounded-lg neon-border bg-shade-black-900 px-3 py-2 text-shade-red-100 focus:neon-glow outline-none transition-all"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-shade-red-200 mb-1">Avatar URL</label>
          <input
            className="w-full rounded-lg neon-border bg-shade-black-900 px-3 py-2 text-shade-red-100 focus:neon-glow outline-none transition-all"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm text-shade-red-200 mb-1">Bio</label>
          <textarea
            className="w-full rounded-lg neon-border bg-shade-black-900 px-3 py-2 text-shade-red-100 focus:neon-glow outline-none transition-all"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        {error && <p className="text-sm neon-text">{error}</p>}
        {status && <p className="text-sm text-shade-red-600 neon-text">{status}</p>}
        <button
          type="submit"
          className="rounded-full bg-shade-black-900 neon-border px-4 py-2 text-shade-red-600 font-semibold hover:neon-glow-strong transition-all"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
