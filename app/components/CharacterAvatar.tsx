import { useState } from "react";
import { apiClient } from "../lib/api";

type Sized = "sm" | "md" | "lg";

const BOX: Record<Sized, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-14 h-14 text-xl",
  lg: "w-24 h-24 text-3xl",
};

/**
 * A character's avatar.
 *
 * Avatars are per character — each one generates its own, and the account-level
 * avatar is only a fallback for characters that have not. Falls back again to
 * the first letter of the gamertag so a slot is never blank.
 */
export function CharacterAvatar({
  src,
  name,
  size = "md",
  glow = false,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: Sized;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${BOX[size]} rounded-full overflow-hidden silhouette-avatar ${glow ? "breathing-glow" : ""} flex items-center justify-center shrink-0 ${className}`}
    >
      {src
        ? <img src={src} alt={name ? `${name} avatar` : "avatar"} className="w-full h-full object-cover" />
        : <span className="neon-text">{name?.charAt(0)?.toUpperCase() ?? "?"}</span>}
    </div>
  );
}

/**
 * Generate an avatar for one specific character.
 *
 * The prompt follows the character's class — a phoenix for the phoenix line, a
 * dragon for the dragon line, a spirit for kies — so the button belongs on the
 * character rather than on the account.
 */
export function GenerateAvatarButton({
  characterId,
  onGenerated,
  label = "Generate avatar",
}: {
  characterId: string;
  onGenerated?: (url: string | null) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.post<{ image?: string; url?: string }>(
        `/ai/shade-avatar?character_id=${encodeURIComponent(characterId)}`,
        {},
      );
      // `image` is an inline preview; `url` is the stored one. Prefer the
      // stored URL so a reload shows the same picture.
      onGenerated?.(r.url ?? r.image ?? null);
      if (!r.url) setError("Generated, but saving failed — it may not stick.");
    } catch (e: any) {
      setError(e?.message || "Could not generate an avatar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-shade-black-800 border border-shade-red-700/50 text-shade-red-300 hover:bg-shade-red-900/30 hover:text-shade-red-100 transition-all disabled:opacity-50"
      >
        {busy ? "Generating…" : label}
      </button>
      {error && <p className="text-shade-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}
