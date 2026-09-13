import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

// Game actions default to the active character; character_id targets a specific one.
function withChar(path: string, characterId?: string | null) {
  if (!characterId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}character_id=${encodeURIComponent(characterId)}`;
}

/**
 * Clan recruitment for one character.
 *
 * Clan size multiplies equipment attack and defence in battle, so it belongs
 * with the rest of that character's numbers rather than on the shared battle
 * screen — it is a property of the character, not of the fight.
 */
export function ClanPanel({ characterId, onUpdate }: { characterId?: string | null; onUpdate: () => void }) {
  const [clanData, setClanData] = useState<any>(null);
  const [recruitCount, setRecruitCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClan = async () => {
    try {
      const res = await apiClient.get<{ data: any }>(withChar('/storm8/clan', characterId));
      setClanData(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClan();
  }, []);

  const handleRecruit = async () => {
    setError(null);
    try {
      await apiClient.post(withChar('/storm8/clan/recruit', characterId), { count: recruitCount });
      fetchClan();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to recruit');
    }
  };

  if (loading) return <div>Loading clan data...</div>;

  return (
    <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50 shadow-[0_0_20px_rgba(255,42,42,0.10)]">
      <h2 className="text-2xl font-bold mb-4 neon-text">Clan Management</h2>

      {clanData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-shade-black-600 neon-border p-4 rounded hover:neon-glow transition-all">
              <p className="text-shade-red-300 text-sm">Total Members</p>
              <p className="text-3xl font-bold text-shade-red-100">{clanData.total_members}</p>
            </div>
            <div className="bg-shade-black-600 neon-border p-4 rounded hover:neon-glow transition-all">
              <p className="text-shade-red-300 text-sm">Usable in Battle</p>
              <p className="text-3xl font-bold text-shade-red-600">{clanData.usable_in_battle}</p>
              <p className="text-xs text-shade-red-300">Max: {clanData.max_usable}</p>
            </div>
            <div className="bg-shade-black-600 neon-border p-4 rounded hover:neon-glow transition-all">
              <p className="text-shade-red-300 text-sm">Bracket</p>
              <p className="text-3xl font-bold text-shade-red-400">{clanData.bracket}</p>
              <p className="text-xs text-shade-red-300">You can only fight players in this bracket</p>
            </div>
            <div className="bg-shade-black-600 neon-border p-4 rounded hover:neon-glow transition-all">
              <p className="text-shade-red-300 text-sm">Active Members</p>
              <p className="text-3xl font-bold text-shade-red-100">{clanData.active_members}</p>
            </div>
          </div>

          <div className="border-t border-shade-red-800 pt-4">
            <h3 className="font-bold mb-3 text-shade-red-100">Recruit New Members</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={recruitCount}
                onChange={e => setRecruitCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 p-2 rounded bg-shade-black-600 neon-border text-shade-red-100"
                min="1"
              />
              <button
                onClick={handleRecruit}
                className="flex-1 bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white hover:from-shade-red-600 hover:to-shade-red-400 transition-all shadow-lg shadow-shade-red-900/40 p-2 rounded font-bold"
              >
                Recruit {recruitCount} Member{recruitCount !== 1 ? 's' : ''}
              </button>
            </div>
            <p className="text-sm text-shade-red-300 mt-2">
              Cost: {recruitCount * 100} currency
            </p>
            {error && <p className="text-shade-red-600 mt-2">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
