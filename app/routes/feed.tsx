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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="relative overflow-hidden rounded-3xl social-panel p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-social-green-500/5 to-transparent"></div>
          <div className="relative">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-social-green-600 bg-social-green-100/80 rounded-full uppercase mb-4">
              Your Community
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">Feed</h1>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl">
              Stay connected with friends, share updates, and discover what's happening in your network.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-social-green-500 animate-pulse"></div>
                <span>Signed in as <span className="text-gray-600 font-medium">{user?.username ?? "guest"}</span></span>
              </div>
            </div>
          </div>
        </header>

        <PostComposer onPostCreated={load} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="social-panel rounded-2xl p-8 text-center">
                <div className="relative inline-block">
                  <div className="w-12 h-12 border-4 border-social-green-200 rounded-full animate-spin border-t-social-green-600"></div>
                </div>
                <p className="mt-4 text-gray-500">Loading feed...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="social-panel rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="text-gray-500">No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>

          <aside className="space-y-6">
            <div className="social-panel rounded-2xl p-6 sticky top-24">
              <div className="mb-6">
                <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Quick Links</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">Explore</h3>
              </div>
              <div className="space-y-2">
                <Link to="/friends" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white shadow-lg shadow-social-green-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-social-green-600 transition-colors">Find Friends</span>
                </Link>
                <Link to="/groups" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white shadow-lg shadow-social-green-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-social-green-600 transition-colors">Browse Groups</span>
                </Link>
                <Link to="/messages" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white shadow-lg shadow-social-green-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-social-green-600 transition-colors">Messages</span>
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
