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
    <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-social-green-200 rounded-full animate-spin border-t-social-green-600"></div>
          <span className="text-sm">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-xs font-bold shadow shadow-social-green-500/20 flex-shrink-0">
                {c.author_username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 bg-gray-50/80 rounded-xl px-4 py-2">
                <p className="text-xs font-medium text-gray-700">{c.author_username}</p>
                <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="w-full px-4 py-3 bg-gray-50/80 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300 resize-none text-sm"
            rows={2}
            placeholder="Add a comment..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button className="social-button rounded-xl px-4 py-2 text-sm font-semibold">
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400">Log in to comment.</p>
      )}
    </div>
  );
}
