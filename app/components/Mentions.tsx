import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiClient } from "../lib/api";

/**
 * Renders text with "@handle" references turned into links.
 *
 * A handle is a gamertag or a username — the same thing /shade/u/:name
 * resolves, gamertag first. Handles are validated against the server before
 * they are linked, so a typo or a deleted character renders as plain text
 * rather than a dead link.
 */

// Mirrors sanitizeGamertag on the server: [A-Za-z0-9_.-], 3-20 chars. The
// trailing boundary stops a sentence-ending period joining the handle.
const MENTION_RE = /@([A-Za-z0-9_](?:[A-Za-z0-9_.-]{1,18}[A-Za-z0-9_])?)/g;

/** Pull the distinct handles out of a block of text. */
export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[1]);
  return [...out];
}

/**
 * Resolve handles across several texts at once, so a wall of comments costs
 * one request rather than one per comment.
 */
export function useResolvedMentions(texts: string[]): Set<string> {
  const [known, setKnown] = useState<Set<string>>(new Set());
  const names = [...new Set(texts.flatMap(extractMentions))];
  const key = names.slice().sort().join(",");

  useEffect(() => {
    if (names.length === 0) {
      setKnown(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await apiClient.post<{ data: { name: string; kind: string }[] }>(
          "/game/mentions/resolve",
          { names: names.slice(0, 50) },
        );
        if (cancelled) return;
        setKnown(new Set((r.data || []).map((d) => d.name.toLowerCase())));
      } catch {
        // Leave mentions unlinked rather than guessing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return known;
}

/** Text with its valid @mentions linked to the matching gamer profile. */
export function MentionText({ text, known }: { text: string; known: Set<string> }) {
  const parts: React.ReactNode[] = [];
  let last = 0;

  for (const m of text.matchAll(MENTION_RE)) {
    const handle = m[1];
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));

    if (known.has(handle.toLowerCase())) {
      parts.push(
        <Link
          key={`${at}-${handle}`}
          to={`/shade/u/${encodeURIComponent(handle)}`}
          className="text-shade-red-300 font-semibold hover:underline"
        >
          @{handle}
        </Link>,
      );
    } else {
      parts.push(m[0]);
    }
    last = at + m[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
