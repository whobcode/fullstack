import { useState } from "react";
import { apiClient } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

type Props = {
  onPostCreated?: () => void;
};

export function PostComposer({ onPostCreated }: Props) {
  const { isAuthenticated } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/social/posts", { body });
      setBody("");
      onPostCreated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="social-panel rounded-2xl p-6 text-center">
        <p className="text-gray-500">Log in to share updates with your network.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="social-panel rounded-2xl p-6">
      <textarea
        className="w-full px-5 py-4 bg-gray-50/80 border-0 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300 resize-none"
        rows={3}
        placeholder="What's on your mind?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="social-button rounded-xl px-6 py-3 font-semibold disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
