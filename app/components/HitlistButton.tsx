import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";

type Status = {
  listed_count: number;
  distinct_posters: number;
  listings_remaining: number;
  globalled_until: string | null;
  is_globalled: boolean;
  max_listings: number;
  max_per_poster: number;
  min_posters_to_global: number;
};

/** Server floor for a bounty (postBountySchema). */
const MIN_BOUNTY = 1000;

/**
 * Put a bounty on one character, from anywhere that shows a character.
 *
 * Also surfaces how close the target is to being globalled — 200 listings in
 * 24h maxes them out, and no single player can place more than 25 of those, so
 * it takes at least 8 people. A globalled target cannot be listed at all until
 * their cooldown expires, and the control says so rather than failing on submit.
 */
export function HitlistButton({
  gamertag,
  onPosted,
  compact = false,
}: {
  gamertag: string;
  onPosted?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [amount, setAmount] = useState(String(MIN_BOUNTY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const r = await apiClient.get<{ data: Status }>(
        `/storm8/hitlist/status/${encodeURIComponent(gamertag)}`,
      );
      setStatus(r.data);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    if (open && gamertag) loadStatus();
  }, [open, gamertag]);

  const post = async () => {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n < MIN_BOUNTY) {
      setError(`Minimum bounty is ${MIN_BOUNTY.toLocaleString()}.`);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await apiClient.post<{ data: any }>("/storm8/hitlist/post", {
        target_gamertag: gamertag,
        bounty_amount: n,
      });
      const d = r.data;
      setNotice(
        d?.globalled
          ? `Globalled — ${gamertag} hit ${d.globalled.listed_count} listings from ${d.globalled.distinct_posters} players and cannot be listed for 24h.`
          : `Bounty posted. You can place ${d?.listings_remaining_from_you ?? 0} more on them today.`,
      );
      await loadStatus();
      onPosted?.();
    } catch (e: any) {
      setError(e?.message || "Could not post the bounty");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? "px-3 py-1.5 rounded-lg text-xs font-bold bg-shade-black-800 border border-amber-700/50 text-amber-300 hover:bg-amber-900/30 transition-all"
            : "px-4 py-2 rounded-lg font-bold bg-shade-black-800 border border-amber-700/50 text-amber-300 hover:bg-amber-900/30 transition-all text-sm"
        }
        title={`Put a bounty on ${gamertag}`}
      >
        🎯 Add to hitlist
      </button>
    );
  }

  const pct = status ? Math.min(100, Math.round((status.listed_count / status.max_listings) * 100)) : 0;

  return (
    <div className="mt-2 p-3 rounded-lg bg-shade-black-950/70 border border-amber-700/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-amber-300">Bounty on {gamertag}</span>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-shade-ash hover:text-shade-red-300"
        >
          close
        </button>
      </div>

      {status && (
        <>
          <div className="h-1.5 rounded-full bg-shade-black-700 overflow-hidden mb-1">
            <div
              className={`h-full rounded-full ${
                status.is_globalled
                  ? "bg-gradient-to-r from-amber-500 to-amber-300"
                  : "bg-gradient-to-r from-shade-red-700 to-shade-red-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-shade-ash mb-2">
            {status.is_globalled ? (
              <>Globalled — cannot be listed until {new Date(status.globalled_until!).toLocaleString()}.</>
            ) : (
              <>
                {status.listed_count} / {status.max_listings} listings ·{" "}
                {status.listings_remaining} left before they global
              </>
            )}
          </p>
        </>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          min={MIN_BOUNTY}
          step={100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!!status?.is_globalled}
          className="flex-1 min-w-0 p-2 rounded bg-shade-black-950 border border-amber-700/40 text-shade-red-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
        />
        <button
          onClick={post}
          disabled={busy || !!status?.is_globalled}
          className="px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white hover:from-shade-red-600 hover:to-shade-red-400 transition-all disabled:opacity-50"
        >
          {status?.is_globalled ? "Globalled" : busy ? "Posting…" : "Post"}
        </button>
      </div>

      <p className="text-[10px] text-shade-ash mt-1">
        Paid from currency on hand. You cannot collect this bounty with the character that posts it.
      </p>

      {notice && <p className="text-emerald-300 text-[11px] mt-2">{notice}</p>}
      {error && <p className="text-shade-red-500 text-[11px] mt-2">{error}</p>}
    </div>
  );
}
