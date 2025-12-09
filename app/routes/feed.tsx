import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { PostComposer } from "../components/social/PostComposer";
import { PostCard } from "../components/social/PostCard";
import { GuildPanel } from "../components/social/GuildPanel";
import type { Post } from "../types/social";
import { apiClient } from "../lib/api";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Post[] }>("/social/posts");
      setPosts(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-indigo-900/40 to-slate-950 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-indigo-200/80">Social HQ</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Squad Feed</h1>
        <p className="mt-2 max-w-3xl text-slate-200/80">
          Rally friends from Facebook, swap loot stories, and spin up turn-based raids without
          leaving the social stream.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
          <span className="rounded-full bg-indigo-700/30 px-3 py-1">Connected as {user?.username ?? "guest"}</span>
          <Link to="/game/dashboard" className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500">
            Open Game Dashboard
          </Link>
        </div>
      </header>

      <PostComposer onPostCreated={load} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading feed...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-slate-400">No posts yet. Be the first to share a raid recap!</p>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow">
            <p className="text-xs uppercase tracking-wide text-slate-400">Game status</p>
            <h3 className="text-xl font-semibold text-white">MMORPG quick links</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-200/80">
              <Link to="/game/dashboard" className="block rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700">
                Character sheet & stat spend
              </Link>
              <Link to="/game/leaderboard" className="block rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700">
                Leaderboard & trophies
              </Link>
              <Link to="/game/players" className="block rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700">
                Matchmaking & live battles
              </Link>
            </div>
          </div>

          <GuildPanel />
        </aside>
      </div>
    </div>
  );
}
