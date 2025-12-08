import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api";
import type { Comment } from "../../types/social";
import { useAuth } from "../../lib/AuthContext";

type Props = {
  postId: string;
  onCommentAdded?: () => void;
};

export function CommentList({ postId, onCommentAdded }: Props) {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Comment[] }>(`/social/posts/${postId}/comments`);
      setComments(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    try {
      await apiClient.post(`/social/posts/${postId}/comments`, { body });
      setBody("");
      await load();
      onCommentAdded?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {loading ? (
        <p className="text-sm text-slate-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-slate-950/60 px-3 py-2">
              <p className="text-xs text-slate-400">{c.author_username}</p>
              <p className="text-sm text-slate-100">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            rows={2}
            placeholder="Add a comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700">
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate-500">Log in to comment.</p>
      )}
    </div>
  );
}
