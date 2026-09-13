import { CharacterAvatar } from "./CharacterAvatar";

type Choice = {
  id: string;
  gamertag: string | null;
  class?: string | null;
  level?: number;
  slot_number?: number;
  avatar_url?: string | null;
  first_game_access_completed?: boolean;
};

/**
 * "Playing as" picker.
 *
 * A native <select> cannot render an image per option, and avatars are the
 * fastest way to tell characters apart, so this is a row of buttons instead.
 * It scrolls sideways rather than wrapping, which keeps it to one line on a
 * phone however many slots are filled.
 */
export function CharacterChooser({
  characters,
  activeId,
  onSelect,
  label = "Playing as",
}: {
  characters: Choice[];
  activeId: string | null;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const playable = characters.filter((c) => c.first_game_access_completed !== false);
  if (playable.length === 0) return null;

  return (
    <div className="min-w-0">
      <span className="block text-xs text-shade-red-300 mb-1">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={label}>
        {playable.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(c.id)}
              title={c.class ? `${c.gamertag} — ${c.class} Lv.${c.level}` : c.gamertag ?? undefined}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border shrink-0 transition-all ${
                active
                  ? "bg-shade-red-900/40 border-shade-red-600/70 text-shade-red-100"
                  : "bg-shade-black-800 border-shade-red-800/40 text-shade-red-300 hover:text-shade-red-100 hover:border-shade-red-700/60"
              }`}
            >
              <CharacterAvatar src={c.avatar_url} name={c.gamertag} size="sm" />
              <span className="text-sm font-bold whitespace-nowrap">{c.gamertag}</span>
              {typeof c.level === "number" && (
                <span className="text-[10px] text-shade-ash whitespace-nowrap">Lv.{c.level}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
