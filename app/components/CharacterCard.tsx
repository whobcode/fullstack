import { useEffect, useState } from "react";

type Card = {
  gamertag: string | null;
  class: string | null;
  level: number;
  xp: number;
  hp: number; atk: number; def: number; mp: number; spd: number;
  wins: number; losses: number; kills: number; deaths: number;
};

const CLASS_LABEL: Record<string, string> = {
  phoenix: "Phoenix", dphoenix: "Dark Phoenix", dragon: "Dragon", ddragon: "Dark Dragon", kies: "Kies",
};

/** Public RPG character card for a user. Pass a userId; it fetches /api/users/:id/character-card. */
export default function CharacterCard({ userId }: { userId?: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetch(`/api/users/${userId}/character-card`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data: Card }>) : Promise.reject(new Error("no card"))))
      .then((d) => { if (active) { setCard(d.data); setState("ok"); } })
      .catch(() => active && setState("none"));
    return () => { active = false; };
  }, [userId]);

  if (state === "loading") return <div className="rounded-2xl bg-white shadow p-5 animate-pulse h-40" />;
  if (state === "none" || !card) return null;

  const stat = (label: string, value: number) => (
    <div className="flex flex-col items-center">
      <span className="text-xs uppercase tracking-wide text-social-green-700/70">{label}</span>
      <span className="font-bold text-social-green-900">{value.toLocaleString()}</span>
    </div>
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-social-green-600 to-social-green-700 text-white shadow-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80">RPG Character</div>
          <div className="text-2xl font-extrabold leading-tight">{card.gamertag || "Unnamed"}</div>
          <div className="opacity-90 text-sm">{card.class ? CLASS_LABEL[card.class] ?? card.class : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black">Lv {card.level}</div>
          <div className="text-xs opacity-80">{card.wins}W · {card.losses}L · {card.kills}K</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 rounded-xl bg-white/90 p-3">
        {stat("HP", card.hp)}{stat("ATK", card.atk)}{stat("DEF", card.def)}{stat("MP", card.mp)}{stat("SPD", card.spd)}
      </div>
    </div>
  );
}
