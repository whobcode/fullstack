import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { useActiveCharacter } from "../lib/ActiveCharacterContext";
import { Breadcrumb } from "../components/Breadcrumb";

type Ability = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: "equipment" | "utility";
  focus: "atk" | "def" | "hp";
  family: string | null;
  attack_value: number;
  defense_value: number;
  hp_value: number;
  hp_pct: number;
  spd_value: number;
  stamina_bonus: number;
  stamina_regen_pct: number;
  cost: number;
  level_requirement: number;
  max_quantity: number;
  sellback_pct: number;
  owned: number;
  required_level: number;
  at_max: boolean;
  unlocked: boolean;
};

const FOCUS_ORDER: Ability["focus"][] = ["atk", "def", "hp"];
const FOCUS_LABEL: Record<Ability["focus"], string> = { atk: "Phoenix · attack", def: "Dragon · defense", hp: "Kies · health" };
const FOCUS_TINT: Record<Ability["focus"], string> = {
  atk: "border-rose-700/40 hover:border-rose-500/60",
  def: "border-sky-700/40 hover:border-sky-500/60",
  hp: "border-emerald-700/40 hover:border-emerald-500/60",
};

/**
 * The store: abilities and consumables, off the dashboard rather than buried in
 * the battle tab.
 *
 * 36 abilities as a flat list is unreadable, so they are grouped by family with
 * the three focuses side by side — which is also the decision the player is
 * actually making, since only 12 distinct abilities can be held at once.
 */
export default function StorePage() {
  const { activeCharacter, refresh } = useActiveCharacter();
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const charId = activeCharacter?.id;
  const withChar = (p: string) => `${p}${p.includes("?") ? "&" : "?"}character_id=${encodeURIComponent(charId || "")}`;

  const load = useCallback(async () => {
    if (!charId) return;
    try {
      const r = await apiClient.get<{ data: Ability[] }>(withChar("/storm8/abilities"));
      setAbilities(r.data || []);
    } catch (e: any) {
      setError(e?.message || "Could not load the store");
    } finally {
      setLoading(false);
    }
  }, [charId]);

  useEffect(() => { load(); }, [load]);

  const act = async (path: string, ability_id: string, label: string) => {
    setBusy(ability_id); setError(null); setNotice(null);
    try {
      const r = await apiClient.post<{ message?: string }>(withChar(path), { ability_id });
      setNotice(r.message || label);
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      setError(e?.message || `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const heal = async () => {
    setBusy("heal"); setError(null); setNotice(null);
    try {
      const r = await apiClient.post<{ message?: string }>(withChar("/storm8/hospital/heal"), {});
      setNotice(r.message || "Healed to full.");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Heal failed");
    } finally {
      setBusy(null);
    }
  };

  // Distinct equipment held, against the 12-slot cap.
  const slotsUsed = useMemo(
    () => abilities.filter((a) => a.kind === "equipment" && a.owned > 0).length,
    [abilities],
  );

  const families = useMemo(() => {
    const byFamily = new Map<string, Ability[]>();
    for (const a of abilities) {
      if (a.kind !== "equipment") continue;
      const key = a.family || a.name;
      if (!byFamily.has(key)) byFamily.set(key, []);
      byFamily.get(key)!.push(a);
    }
    return [...byFamily.entries()]
      .map(([key, list]) => ({
        key,
        cost: list[0]?.cost ?? 0,
        level: list[0]?.level_requirement ?? 1,
        variants: FOCUS_ORDER.map((f) => list.find((a) => a.focus === f)).filter(Boolean) as Ability[],
      }))
      .sort((a, b) => a.cost - b.cost);
  }, [abilities]);

  const utilities = abilities.filter((a) => a.kind === "utility");
  const held = activeCharacter?.unbanked_currency ?? 0;

  if (!activeCharacter) {
    return <div className="p-6 text-shade-red-300">No character selected. <Link to="/shade/dashboard" className="underline">Dashboard</Link></div>;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumb items={[{ label: "Dashboard", to: "/shade/dashboard" }, { label: "Store" }]} />
        <span className="text-sm text-amber-300 font-bold">{held.toLocaleString()} <span className="text-shade-ash font-normal">on hand</span></span>
      </div>

      <h1 className="text-2xl font-bold neon-text">Store</h1>

      {notice && <p className="text-emerald-300 text-sm">{notice}</p>}
      {error && <p className="text-shade-red-500 text-sm">{error}</p>}

      {/* Consumables */}
      <section className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-shade-black-900 border border-emerald-800/40">
        <h2 className="text-lg font-bold text-emerald-300 mb-1">Potions</h2>
        <p className="text-[11px] text-shade-ash mb-3">
          Health costs 10 per point. A defeated character cannot be attacked, but cannot attack either.
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-shade-red-200">
            {(activeCharacter.current_health ?? 0).toLocaleString()} / {(activeCharacter.max_health ?? 0).toLocaleString()} HP
          </span>
          <button
            onClick={heal}
            disabled={busy === "heal" || (activeCharacter.current_health >= activeCharacter.max_health)}
            className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 text-white disabled:opacity-50"
          >
            {activeCharacter.current_health >= activeCharacter.max_health
              ? "At full health"
              : `Full Heal — ${((activeCharacter.max_health - activeCharacter.current_health) * 10).toLocaleString()}`}
          </button>
        </div>
      </section>

      {/* Utility abilities: shared across every character on the account. */}
      {utilities.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold neon-text">Utilities</h2>
          <p className="text-[11px] text-shade-ash">Shared by every character you own, and exempt from the 12-ability limit.</p>
          {utilities.map((a) => (
            <AbilityRow key={a.id} a={a} busy={busy} onBuy={() => act("/storm8/abilities/purchase", a.id, "Purchase")} onSell={() => act("/storm8/abilities/sell", a.id, "Sale")} />
          ))}
        </section>
      )}

      {/* Equipment, grouped so the focus choice is visible. */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-bold neon-text">Abilities</h2>
          <span className={`text-xs ${slotsUsed >= 12 ? "text-amber-300" : "text-shade-ash"}`}>
            {slotsUsed}/12 ability slots used
          </span>
        </div>

        {loading ? (
          <p className="text-shade-red-400 text-sm">Loading…</p>
        ) : families.map((fam) => (
          <div key={fam.key} className="rounded-xl p-3 bg-shade-black-900/60 border border-shade-red-900/40">
            <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider text-shade-red-400">Level {fam.level}</span>
              <span className="text-xs text-shade-ash">{fam.cost.toLocaleString()} each</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {fam.variants.map((a) => (
                <AbilityRow
                  key={a.id}
                  a={a}
                  compact
                  busy={busy}
                  blockedBySlots={slotsUsed >= 12 && a.owned === 0}
                  onBuy={() => act("/storm8/abilities/purchase", a.id, "Purchase")}
                  onSell={() => act("/storm8/abilities/sell", a.id, "Sale")}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function AbilityRow({
  a, busy, onBuy, onSell, compact = false, blockedBySlots = false,
}: {
  a: Ability; busy: string | null; onBuy: () => void; onSell: () => void;
  compact?: boolean; blockedBySlots?: boolean;
}) {
  const working = busy === a.id;
  const cannotBuy = a.at_max || !a.unlocked || blockedBySlots;

  return (
    <div className={`rounded-lg p-3 bg-shade-black-950/60 border transition-all ${compact ? FOCUS_TINT[a.focus] : "border-white/10"}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-shade-red-100 truncate">{a.name}</h3>
          {compact && <p className="text-[10px] text-shade-ash">{FOCUS_LABEL[a.focus]}</p>}
        </div>
        <span className="text-[10px] text-shade-ash shrink-0">{a.owned}/{a.max_quantity}</span>
      </div>

      <p className="text-[11px] text-shade-ash mb-2 leading-snug">{a.description}</p>

      <div className="flex gap-1.5">
        <button
          onClick={onBuy}
          disabled={working || cannotBuy}
          title={
            a.at_max ? "You hold the maximum"
              : blockedBySlots ? "All 12 ability slots are in use — sell one first"
              : !a.unlocked ? `Needs level ${a.required_level}`
              : undefined
          }
          className="flex-1 px-2 py-1.5 rounded text-[11px] font-bold bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white disabled:opacity-40"
        >
          {a.at_max ? "Maxed"
            : blockedBySlots ? "No slots"
            : !a.unlocked ? `Lv.${a.required_level}`
            : `Buy ${a.cost.toLocaleString()}`}
        </button>
        {a.owned > 0 && (
          <button
            onClick={onSell}
            disabled={working}
            title={`Sell one back for ${a.sellback_pct}% of ${a.cost.toLocaleString()}`}
            className="px-2 py-1.5 rounded text-[11px] bg-shade-black-950 border border-amber-700/50 text-amber-300 disabled:opacity-40"
          >
            Sell {Math.floor((a.cost * a.sellback_pct) / 100).toLocaleString()}
          </button>
        )}
      </div>
    </div>
  );
}
