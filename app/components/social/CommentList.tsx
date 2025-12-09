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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <p className="text-sm text-shade-red-300 neon-pulse">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-shade-red-400">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-shade-black-600 neon-border px-3 py-2">
              <p className="text-xs text-shade-red-400">{c.author_username}</p>
              <p className="text-sm text-shade-red-200">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="w-full rounded-lg neon-border bg-shade-black-900 px-3 py-2 text-sm text-shade-red-100 focus:neon-glow outline-none transition-all"
            rows={2}
            placeholder="Add a comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs neon-text">{error}</p>}
          <div className="flex justify-end">
            <button className="rounded-full bg-shade-black-900 neon-border px-3 py-1 text-xs font-semibold text-shade-red-200 hover:neon-glow transition-all">
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-shade-red-400">Log in to comment.</p>
      )}
    </div>
  );
}
