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
    <div className="social-panel rounded-2xl p-6">
      <div className="mb-6">
        <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Suggestions</span>
        <h3 className="text-xl font-bold text-gray-900 mt-1">Community</h3>
      </div>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No groups yet</p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 text-sm">{g.name}</p>
                <p className="text-xs text-gray-400">by {g.owner_username}</p>
                <p className="text-xs text-social-green-600 font-medium">{g.members} members</p>
              </div>
              <button
                className="social-button rounded-xl px-4 py-2 text-xs font-semibold"
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
