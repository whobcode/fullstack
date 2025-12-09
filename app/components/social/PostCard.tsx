import { useState } from "react";
import { apiClient } from "../../lib/api";
import type { Post, ReactionKind } from "../../types/social";
import { CommentList } from "./CommentList";
import { useAuth } from "../../lib/AuthContext";

/**
 * @typedef {object} Props
 * @property {Post} post - The post to display.
 */
type Props = {
  post: Post;
};

const reactionLabels: { kind: ReactionKind; label: string }[] = [
  { kind: "like", label: "Like" },
  { kind: "hype", label: "Love" },
  { kind: "gg", label: "Celebrate" },
];

/**
 * A component that displays a single post, including its author, body, and reactions.
 * It also allows users to react to the post and view its comments.
 * @param {Props} props - The props for the component.
 * @returns {JSX.Element} The PostCard component.
 */
export function PostCard({ post }: Props) {
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [counts, setCounts] = useState({
    like: post.likes ?? 0,
    hype: post.hype ?? 0,
    gg: post.gg ?? 0,
    comments: post.comments ?? 0,
  });
  const [error, setError] = useState<string | null>(null);

  const react = async (kind: ReactionKind) => {
    if (!isAuthenticated) {
      setError("Login required to react");
      return;
    }
    setError(null);
    try {
      await apiClient.post(`/social/posts/${post.id}/react`, { type: kind });
      setCounts((c) => ({ ...c, [kind]: c[kind as ReactionKind] + 1 }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <article className="rounded-2xl social-panel p-5 shadow">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-social-navy-700">{post.author_username}</p>
          <p className="text-xs text-social-navy-400">{new Date(post.created_at).toLocaleString()}</p>
        </div>
      </header>
      <p className="mt-3 text-social-navy-600 whitespace-pre-wrap">{post.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {reactionLabels.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => react(kind)}
            className="rounded-full bg-social-cream-200 border border-social-cream-400 px-3 py-1 text-social-navy-600 hover:bg-social-cream-300 hover:border-social-gold-400 transition-colors"
          >
            {label} {counts[kind] ?? 0}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full bg-social-cream-200 border border-social-cream-400 px-3 py-1 text-social-navy-600 hover:bg-social-cream-300 hover:border-social-gold-400 transition-colors"
        >
          Comments {counts.comments}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-social-orange-700">{error}</p>}

      {expanded && (
        <CommentList
          postId={post.id}
          onCommentAdded={() => setCounts((c) => ({ ...c, comments: (c.comments ?? 0) + 1 }))}
        />
      )}
    </article>
  );
}
