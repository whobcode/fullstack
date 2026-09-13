import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api";

type Snapshot = {
  character_id: string;
  balance: number;
  unbanked_currency: number;
  deposit_fee_rate: number;
  ledger: {
    id: string;
    kind: "deposit" | "withdraw";
    amount: number;
    fee: number;
    balance_after: number;
    created_at: string;
  }[];
};

/**
 * Currency for one character: what it is holding, what it has banked, and the
 * controls to move between them.
 *
 * Held currency is spendable but stealable — a fight you lose hands a share to
 * the winner. Banked currency is safe but has to come out before it can be
 * spent. Both are per character, not per account.
 */
export function BankPanel({
  characterId,
  gamertag,
  onChange,
}: {
  characterId: string;
  gamertag: string;
  onChange?: () => void;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const withChar = (path: string) => `${path}${path.includes("?") ? "&" : "?"}character_id=${encodeURIComponent(characterId)}`;

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get<{ data: Snapshot }>(withChar("/storm8/bank"));
      setSnap(r.data);
    } catch (e: any) {
      setError(e?.message || "Could not load the bank");
    }
  }, [characterId]);

  useEffect(() => {
    if (characterId) load();
  }, [characterId, load]);

  const move = async (kind: "deposit" | "withdraw") => {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a whole amount greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await apiClient.post<{ message: string }>(withChar(`/storm8/bank/${kind}`), { amount: n });
      setNotice(r.message);
      setAmount("");
      await load();
      onChange?.();
    } catch (e: any) {
      setError(e?.message || `${kind} failed`);
    } finally {
      setBusy(false);
    }
  };

  const held = snap?.unbanked_currency ?? 0;
  const balance = snap?.balance ?? 0;
  const feeRate = snap?.deposit_fee_rate ?? 0.1;
  const typed = parseInt(amount, 10);
  const previewFee = Number.isFinite(typed) && typed > 0 ? Math.floor(typed * feeRate) : 0;

  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-amber-950/40 to-shade-black-900 border border-amber-800/40">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-amber-300">💰 Currency</h2>
        <span className="text-[11px] text-shade-ash">{gamertag}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3 bg-shade-black-950/60 border border-amber-700/30">
          <div className="text-[10px] uppercase tracking-wider text-amber-200/70">On hand</div>
          <div className="text-2xl font-bold text-amber-300">{held.toLocaleString()}</div>
          <div className="text-[10px] text-shade-ash mt-1">Spendable — and stealable if you lose a fight</div>
        </div>
        <div className="rounded-lg p-3 bg-shade-black-950/60 border border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-shade-red-400">Banked</div>
          <div className="text-2xl font-bold text-emerald-300">{balance.toLocaleString()}</div>
          <div className="text-[10px] text-shade-ash mt-1">Safe from attackers</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1 min-w-[8rem] p-2 rounded bg-shade-black-950 border border-amber-700/40 text-shade-red-100 placeholder-shade-ash-dim focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
        <button
          onClick={() => move("deposit")}
          disabled={busy || held <= 0}
          className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 text-white hover:from-emerald-600 hover:to-emerald-400 transition-all disabled:opacity-50"
        >
          Deposit
        </button>
        <button
          onClick={() => move("withdraw")}
          disabled={busy || balance <= 0}
          className="px-4 py-2 rounded-lg font-bold bg-shade-black-950 border border-amber-700/50 text-amber-300 hover:bg-amber-900/30 transition-all disabled:opacity-50"
        >
          Withdraw
        </button>
      </div>

      <p className="text-[11px] text-shade-ash mt-2">
        Deposits cost a {Math.round(feeRate * 100)}% fee
        {previewFee > 0 && <> — {previewFee.toLocaleString()} on that amount</>}. Withdrawals are free.
      </p>

      {notice && <p className="text-emerald-300 text-sm mt-2">{notice}</p>}
      {error && <p className="text-shade-red-500 text-sm mt-2">{error}</p>}

      {!!snap?.ledger?.length && (
        <details className="mt-3">
          <summary className="text-xs text-shade-ash cursor-pointer hover:text-shade-red-300">
            Recent activity
          </summary>
          <div className="mt-2 space-y-1">
            {snap.ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-[11px] text-shade-ash">
                <span>
                  <span className={l.kind === "deposit" ? "text-emerald-300" : "text-amber-300"}>
                    {l.kind === "deposit" ? "Deposited" : "Withdrew"}
                  </span>{" "}
                  {l.amount.toLocaleString()}
                  {l.fee > 0 && ` (${l.fee.toLocaleString()} fee)`}
                </span>
                <span className="text-shade-ash-dim">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
