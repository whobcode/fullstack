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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await apiClient.put("/users/me", { username, bio, avatar_url: avatarUrl });
      login({ ...(user || { id: "" }), username });
      setStatus("Saved");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const needsUsername = username.startsWith("fb_");

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow">
        <p className="text-xs uppercase tracking-wide text-indigo-200/80">Profile</p>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        {needsUsername && (
          <p className="mt-2 text-sm text-amber-200">Pick a custom username to replace the temporary Facebook one.</p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
        <div>
          <label className="block text-sm text-slate-200">Username</label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-200">Avatar URL</label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm text-slate-200">Bio</label>
          <textarea
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {status && <p className="text-sm text-emerald-300">{status}</p>}
        <button
          type="submit"
          className="rounded-full bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-500"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
