import { createContext, useContext, useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { BattleArena, type BattleData } from "../components/BattleArena";

type BattleResultContextType = {
  // Show the battle arena overlay for a resolved battle, from anywhere.
  showBattle: (battle: BattleData) => void;
};

const BattleResultContext = createContext<BattleResultContextType | undefined>(undefined);

export function BattleResultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [battle, setBattle] = useState<BattleData | null>(null);

  const showBattle = useCallback((b: BattleData) => setBattle(b), []);
  const close = () => setBattle(null);

  return (
    <BattleResultContext.Provider value={{ showBattle }}>
      {children}
      {battle && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={close}
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <BattleArena battle={battle} attackerAvatar={user?.shade_avatar_url} />
            <button
              onClick={close}
              className="mt-3 w-full bg-shade-black-900 neon-border text-shade-red-400 hover:neon-glow transition-all p-2 rounded font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </BattleResultContext.Provider>
  );
}

export function useBattleResult() {
  const ctx = useContext(BattleResultContext);
  if (!ctx) throw new Error("useBattleResult must be used within a BattleResultProvider");
  return ctx;
}
