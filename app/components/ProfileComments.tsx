import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: string;
  author_user_id: string;
};

// Comment wall for a gamer profile. `name` is a username or a character gamertag.
export function ProfileComments({ name }: { name: string }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await apiClient.get<{ data: Comment[] }>(`/game/profile/${encodeURIComponent(name)}/comments`);
      setComments(r.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (name) load();
  }, [name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await apiClient.post(`/game/profile/${encodeURIComponent(name)}/comments`, { body: body.trim() });
      setBody("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiClient.delete(`/game/comments/${id}`);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50">
      <h2 className="text-lg font-bold neon-text mb-3">Comments</h2>

      {isAuthenticated && (
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Leave a comment…"
            className="flex-1 p-2 rounded bg-shade-black-950 border border-white/10 text-shade-red-100 focus:outline-none focus:ring-2 focus:ring-shade-red-500"
          />
          <button
            disabled={posting || !body.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white font-bold disabled:opacity-50"
          >
            Post
          </button>
        </form>
      )}
      {error && <p className="text-shade-red-500 text-sm mb-2">{error}</p>}

      {loading ? (
        <p className="text-shade-red-400 text-sm">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-shade-red-400 text-sm">No comments yet — be the first.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="p-3 rounded-lg bg-shade-black-950/60 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-shade-red-200">{c.author}</span>
                <span className="text-[10px] text-shade-red-500">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-shade-red-100 text-sm mt-1 break-words">{c.body}</p>
              {user?.id === c.author_user_id && (
                <button onClick={() => remove(c.id)} className="text-[10px] text-shade-red-500 hover:text-shade-red-300 mt-1">
                  delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
