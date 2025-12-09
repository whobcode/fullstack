import { useState } from "react";
import { apiClient } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

/**
 * @typedef {object} Props
 * @property {() => void} [onPostCreated] - A callback function to be called when a post is created.
 */
type Props = {
  onPostCreated?: () => void;
};

/**
 * A component that allows authenticated users to create new posts.
 * @param {Props} props - The props for the component.
 * @returns {JSX.Element} The PostComposer component.
 */
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
      <div className="rounded-2xl social-panel p-4 text-sm text-social-navy-500">
        Log in to share updates with your network.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl social-panel p-4">
      <textarea
        className="w-full rounded-xl social-input px-3 py-2 text-sm"
        rows={3}
        placeholder="What's on your mind?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs text-social-orange-700">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg social-button px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
