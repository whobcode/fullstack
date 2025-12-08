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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        Log in to post battle reports and guild updates.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <textarea
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        rows={3}
        placeholder="Share your last raid, build, or trading tip..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
