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
    <div className="social-dark-bg py-6">
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <header className="rounded-3xl social-dark-card p-6 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-social-blue-400">Your Profile</p>
          <h1 className="text-3xl font-bold text-social-blue-300">Edit Profile</h1>
          {needsUsername && (
            <p className="mt-2 text-sm text-social-orange-400">Pick a custom username to replace the temporary Facebook one.</p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl social-dark-card p-5 shadow">
          <div>
            <label className="block text-sm text-social-blue-400 mb-1">Username</label>
            <input
              className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-social-blue-400 mb-1">Avatar URL</label>
            <input
              className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm text-social-blue-400 mb-1">Bio</label>
            <textarea
              className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
            />
          </div>
          {error && <p className="text-sm text-social-orange-400">{error}</p>}
          {status && <p className="text-sm text-social-blue-400">{status}</p>}
          <button
            type="submit"
            className="rounded-lg social-button px-4 py-2 font-semibold"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
