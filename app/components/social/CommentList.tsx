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
        <p className="text-sm text-social-navy-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-social-navy-400">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2">
              <p className="text-xs text-social-navy-500">{c.author_username}</p>
              <p className="text-sm text-social-navy-600">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            className="w-full rounded-lg social-input px-3 py-2 text-sm"
            rows={2}
            placeholder="Add a comment..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs text-social-orange-700">{error}</p>}
          <div className="flex justify-end">
            <button className="rounded-lg social-button px-3 py-1 text-xs font-semibold">
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-social-navy-400">Log in to comment.</p>
      )}
    </div>
  );
}
