import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { apiClient } from "./api";
import { useAuth } from "./AuthContext";

type Char = any;

type ActiveCharacterContextType = {
  characters: Char[];
  activeId: string | null;
  activeCharacter: Char | null;
  setActive: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
};

const ActiveCharacterContext = createContext<ActiveCharacterContextType | undefined>(undefined);

// Tracks the character the user is "playing as". Persisted server-side so every
// game action defaults to it until the user switches.
export function ActiveCharacterProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [characters, setCharacters] = useState<Char[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: Char[] }>("/game/my-characters");
      const list = (res.data || []).filter((ch: any) => ch.first_game_access_completed);
      setCharacters(list);
      setActiveId((prev) => {
        const valid = (id: string | null | undefined) =>
          id && list.some((ch: any) => ch.id === id) ? id : null;
        return valid(prev) || valid(user?.active_character_id) || (list[0]?.id ?? null);
      });
    } catch {
      // leave as-is
    } finally {
      setLoading(false);
    }
  }, [user?.active_character_id]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setCharacters([]);
      setActiveId(null);
      setLoading(false);
    }
  }, [isAuthenticated, refresh]);

  const setActive = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      await apiClient.post("/game/active-character", { characterId: id });
    } catch {
      // non-fatal; the server default still applies on next load
    }
  }, []);

  const activeCharacter = characters.find((c) => c.id === activeId) ?? null;

  return (
    <ActiveCharacterContext.Provider value={{ characters, activeId, activeCharacter, setActive, refresh, loading }}>
      {children}
    </ActiveCharacterContext.Provider>
  );
}

export function useActiveCharacter() {
  const ctx = useContext(ActiveCharacterContext);
  if (!ctx) throw new Error("useActiveCharacter must be used within an ActiveCharacterProvider");
  return ctx;
}
