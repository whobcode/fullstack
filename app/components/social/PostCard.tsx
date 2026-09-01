import { useState } from "react";
import { apiClient } from "../../lib/api";
import type { Post, ReactionKind } from "../../types/social";
import { CommentList } from "./CommentList";
import { useAuth } from "../../lib/AuthContext";

type Props = {
  post: Post;
};

const reactionLabels: { kind: ReactionKind; label: string }[] = [
  { kind: "like", label: "Like" },
  { kind: "hype", label: "Love" },
  { kind: "gg", label: "Celebrate" },
];

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
    <article className="rounded-2xl social-dark-card p-5 shadow">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-social-blue-300">{post.author_username}</p>
          <p className="text-xs text-social-blue-500">{new Date(post.created_at).toLocaleString()}</p>
        </div>
      </header>
      <p className="mt-3 text-social-blue-400 whitespace-pre-wrap">{post.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {reactionLabels.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => react(kind)}
            className="rounded-full bg-social-blue-900/30 border border-social-blue-600/30 px-3 py-1 text-social-blue-300 hover:bg-social-blue-800/40 hover:border-social-blue-400 transition-colors"
          >
            {label} {counts[kind] ?? 0}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full bg-social-blue-900/30 border border-social-blue-600/30 px-3 py-1 text-social-blue-300 hover:bg-social-blue-800/40 hover:border-social-blue-400 transition-colors"
        >
          Comments {counts.comments}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-social-orange-400">{error}</p>}

      {expanded && (
        <CommentList
          postId={post.id}
          onCommentAdded={() => setCounts((c) => ({ ...c, comments: (c.comments ?? 0) + 1 }))}
        />
      )}
    </article>
  );
}
