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
      <div className="rounded-2xl beveled-panel p-4 text-sm text-shade-red-200">
        Log in to post battle reports and guild updates.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl beveled-panel p-4">
      <textarea
        className="w-full rounded-xl neon-border bg-shade-black-900 px-3 py-2 text-sm text-shade-red-100 focus:neon-glow outline-none transition-all"
        rows={3}
        placeholder="Share your last raid, build, or trading tip..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs neon-text">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-shade-black-900 neon-border px-4 py-2 text-sm font-semibold text-shade-red-600 hover:neon-glow-strong disabled:opacity-60 transition-all"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
