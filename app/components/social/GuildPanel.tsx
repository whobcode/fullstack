import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api";
import type { Group } from "../../types/social";
import { useAuth } from "../../lib/AuthContext";

export function GuildPanel() {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiClient.get<{ data: Group[] }>("/social/groups");
      setGroups(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async (id: string) => {
    if (!isAuthenticated) {
      setError("Login required to join");
      return;
    }
    try {
      await apiClient.post(`/social/groups/${id}/join`, {});
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="rounded-2xl social-panel p-4 shadow">
      <p className="text-xs uppercase tracking-wide text-social-gold-600">Your Groups</p>
      <h3 className="text-xl font-semibold text-social-forest-700">Community</h3>
      {error && <p className="text-xs text-social-orange-700 mt-1">{error}</p>}
      <div className="mt-3 space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-social-forest-400">No groups yet.</p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2">
              <div>
                <p className="font-semibold text-social-forest-700">{g.name}</p>
                <p className="text-xs text-social-forest-400">Created by: {g.owner_username}</p>
                <p className="text-xs text-social-gold-600">{g.members} members</p>
              </div>
              <button
                className="rounded-lg social-button px-3 py-1 text-xs font-semibold"
                onClick={() => join(g.id)}
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
