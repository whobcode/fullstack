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
  { kind: "hype", label: "Hype" },
  { kind: "gg", label: "GG" },
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
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{post.author_username}</p>
          <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
        </div>
      </header>
      <p className="mt-3 text-slate-100 whitespace-pre-wrap">{post.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        {reactionLabels.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => react(kind)}
            className="rounded-full bg-slate-800 px-3 py-1 hover:bg-slate-700"
          >
            {label} • {counts[kind] ?? 0}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full bg-slate-800 px-3 py-1 hover:bg-slate-700"
        >
          Comments • {counts.comments}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {expanded && (
        <CommentList
          postId={post.id}
          onCommentAdded={() => setCounts((c) => ({ ...c, comments: (c.comments ?? 0) + 1 }))}
        />
      )}
    </article>
  );
}
