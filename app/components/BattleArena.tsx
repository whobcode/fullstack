import { useEffect, useRef, useState } from "react";

export type Combatant = {
  gamertag: string;
  health_before: number;
  health_after: number;
  max_health: number;
  killed?: boolean;
};

export type BattleData = {
  attacker: Combatant;
  defender: Combatant;
  first_striker?: "attacker" | "defender";
  damage_dealt: number;
  damage_to_attacker?: number;
  currency_stolen?: number;
  xp_gained?: number;
  level_up?: { new_level: number } | null;
};

// A health bar that colors by remaining percentage.
export function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-500" : "bg-shade-red-600";
  return (
    <div className="w-full bg-shade-black-900 rounded-full h-4 neon-border overflow-hidden">
      <div className={`h-4 rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Fighter({
  name, avatar, hp, maxHp, defeated, role,
}: { name: string; avatar?: string | null; hp: number; maxHp: number; defeated?: boolean; role: string }) {
  return (
    <div className="flex-1 text-center min-w-0">
      <p className="text-xs uppercase tracking-widest text-shade-red-400 mb-1">{role}</p>
      <div className={`w-20 h-20 mx-auto rounded-full overflow-hidden silhouette-avatar flex items-center justify-center mb-2 ${defeated ? "grayscale opacity-40" : "breathing-glow"}`}>
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : <span className="text-2xl neon-text">{(name || "?").charAt(0).toUpperCase()}</span>}
      </div>
      <p className="font-bold text-shade-red-100 truncate">{name}</p>
      <div className="mt-2"><HpBar current={hp} max={maxHp} /></div>
      <p className="text-xs text-shade-red-300 mt-1">
        {Math.max(0, Math.round(hp)).toLocaleString()} / {maxHp.toLocaleString()} HP{defeated ? " 💀" : ""}
      </p>
    </div>
  );
}

// The battle arena: both fighters with HP bars that animate down by the damage
// dealt. Used standalone or inside the global battle-result overlay.
export function BattleArena({ battle, attackerAvatar }: { battle: BattleData; attackerAvatar?: string | null }) {
  const [defHp, setDefHp] = useState(battle.defender.health_before);
  const [atkHp, setAtkHp] = useState(battle.attacker.health_before);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDefHp(battle.defender.health_before);
    setAtkHp(battle.attacker.health_before);
    const start = performance.now();
    const duration = 700;
    const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setDefHp(lerp(battle.defender.health_before, battle.defender.health_after, k));
      setAtkHp(lerp(battle.attacker.health_before, battle.attacker.health_after, k));
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [battle]);

  return (
    <div className="bg-shade-black-700 neon-border rounded-lg p-4">
      {battle.first_striker && (
        <p className="text-center text-[11px] uppercase tracking-widest text-shade-red-400 mb-2">
          {battle.first_striker === "defender"
            ? `${battle.defender.gamertag} was faster — struck first!`
            : `${battle.attacker.gamertag} was faster — struck first!`}
        </p>
      )}
      <div className="flex items-stretch gap-3">
        <Fighter
          role={`Attacker${battle.first_striker === "attacker" ? " ⚡" : ""}`}
          name={battle.attacker.gamertag}
          avatar={attackerAvatar}
          hp={atkHp}
          maxHp={battle.attacker.max_health}
          defeated={battle.attacker.killed && atkHp <= 0}
        />
        <div className="flex flex-col items-center justify-center px-2">
          <span className="text-2xl neon-text-strong">⚔️</span>
          <span className="font-bold text-shade-red-500">-{battle.damage_dealt}</span>
          {(battle.damage_to_attacker ?? 0) > 0 && (
            <span className="text-[10px] text-blue-300 mt-1">counter -{battle.damage_to_attacker}</span>
          )}
        </div>
        <Fighter
          role={`Defender${battle.first_striker === "defender" ? " ⚡" : ""}`}
          name={battle.defender.gamertag}
          hp={defHp}
          maxHp={battle.defender.max_health}
          defeated={battle.defender.killed && defHp <= 0}
        />
      </div>
      <div className="text-center mt-3 text-sm">
        {battle.defender.killed
          ? <p className="text-shade-red-600 font-bold animate-pulse">💀 {battle.defender.gamertag} was DEFEATED!</p>
          : battle.attacker.killed
            ? <p className="text-shade-red-600 font-bold animate-pulse">💀 {battle.attacker.gamertag} was DEFEATED by the counterattack!</p>
            : <p className="text-shade-red-300">{battle.damage_dealt} dealt vs {battle.damage_to_attacker ?? 0} taken.</p>}
        {(battle.currency_stolen || battle.xp_gained || battle.level_up) && (
          <p className="text-shade-red-400 mt-1">
            {(battle.currency_stolen ?? 0) > 0 && <span>💰 Stole {battle.currency_stolen} • </span>}
            {battle.xp_gained != null && <span>+{battle.xp_gained} XP</span>}
            {battle.level_up && <span className="text-green-500"> • Level up → {battle.level_up.new_level}!</span>}
          </p>
        )}
      </div>
    </div>
  );
}
