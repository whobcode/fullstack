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
    <div className="social-dark-bg py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header className="rounded-3xl social-dark-card p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Your Community</p>
          <h1 className="text-3xl font-bold text-social-blue-300 sm:text-4xl">Feed</h1>
          <p className="mt-2 max-w-3xl text-social-blue-400">
            Stay connected with friends, share updates, and discover what's happening in your network.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-social-blue-900/50 border border-social-blue-500/50 px-3 py-1 text-social-blue-300">
              Welcome, {user?.username ?? "guest"}
            </span>
          </div>
        </header>

        <PostComposer onPostCreated={load} />

        {error && <p className="text-sm text-social-orange-400">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <p className="text-sm text-social-blue-400">Loading feed...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-social-blue-400">No posts yet. Be the first to share something!</p>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl social-dark-card p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-blue-400">Quick Links</p>
              <h3 className="text-xl font-semibold text-social-blue-300">Explore</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Link to="/friends" className="block rounded-lg social-dark-card-subtle px-3 py-2 text-social-blue-300 hover:border-social-blue-400 transition-colors">
                  Find Friends
                </Link>
                <Link to="/groups" className="block rounded-lg social-dark-card-subtle px-3 py-2 text-social-blue-300 hover:border-social-blue-400 transition-colors">
                  Browse Groups
                </Link>
                <Link to="/messages" className="block rounded-lg social-dark-card-subtle px-3 py-2 text-social-blue-300 hover:border-social-blue-400 transition-colors">
                  Messages
                </Link>
              </div>
            </div>

            <GuildPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
