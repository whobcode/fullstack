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
    <article className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100/50 hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5 transition-all duration-300">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-social-green-500/20">
            {post.author_username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author_username}</p>
            <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>
      </header>
      <p className="mt-4 text-gray-700 whitespace-pre-wrap">{post.body}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {reactionLabels.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => react(kind)}
            className="rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-social-green-50 hover:border-social-green-200 hover:text-social-green-600 transition-all duration-200"
          >
            {label} {counts[kind] ?? 0}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
            expanded
              ? "bg-social-green-50 border border-social-green-200 text-social-green-600"
              : "bg-gray-50/80 border border-gray-100 text-gray-600 hover:bg-social-green-50 hover:border-social-green-200 hover:text-social-green-600"
          }`}
        >
          Comments {counts.comments}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {expanded && (
        <CommentList
          postId={post.id}
          onCommentAdded={() => setCounts((c) => ({ ...c, comments: (c.comments ?? 0) + 1 }))}
        />
      )}
    </article>
  );
}
