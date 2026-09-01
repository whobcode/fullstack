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
        <p className="text-sm text-social-blue-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-social-blue-500">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl social-dark-card-subtle px-3 py-2">
              <p className="text-xs text-social-blue-400">{c.author_username}</p>
              <p className="text-sm text-social-blue-300">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 text-sm placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
            rows={2}
            placeholder="Add a comment..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs text-social-orange-400">{error}</p>}
          <div className="flex justify-end">
            <button className="rounded-lg social-button px-3 py-1 text-xs font-semibold">
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-social-blue-500">Log in to comment.</p>
      )}
    </div>
  );
}
