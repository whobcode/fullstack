import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { HpBar } from '../components/BattleArena';
import { useBattleResult } from '../lib/BattleResultContext';

// Append the acting character to a storm8 API path so the server acts on the
// character selected in the Battle tab (not just slot 1).
function withChar(path: string, characterId?: string | null) {
  if (!characterId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}character_id=${encodeURIComponent(characterId)}`;
}

// Skill Allocation Interface
function SkillAllocation({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const [skills, setSkills] = useState({
    attack: 0,
    defense: 0,
    health: 0,
    energy: 0,
    stamina: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Skill points draw from the SAME unspent pool as the Dashboard stats — show
  // the real number so it matches what the server will actually accept.
  const availablePoints = character.unspent_stat_points ?? 0;

  const totalAllocated = Object.values(skills).reduce((sum, p) => sum + p, 0);
  const remaining = availablePoints - totalAllocated;

  const handleSkillChange = (skill: keyof typeof skills, value: number) => {
    const newValue = Math.max(0, value);
    setSkills(prev => {
      const currentTotal = Object.values(prev).reduce((sum, p) => sum + p, 0) - prev[skill];
      if (currentTotal + newValue > availablePoints) {
        return prev;
      }
      return { ...prev, [skill]: newValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (totalAllocated === 0) {
      setError('Allocate at least one skill point');
      return;
    }
    try {
      await apiClient.post(withChar('/storm8/skills/allocate', character?.id), skills);
      setSkills({ attack: 0, defense: 0, health: 0, energy: 0, stamina: 0 });
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to allocate skills');
    }
  };

  const getSkillInfo = (skill: string) => {
    switch (skill) {
      case 'attack':
        return `Each point = +${character.level} attack power (scales with level)`;
      case 'defense':
        return `Each point = +${character.level} defense power (scales with level)`;
      case 'health':
        return 'Each point = +10 max HP';
      case 'energy':
        return 'Each point = +1 max energy (for missions)';
      case 'stamina':
        return 'Each point = +1 max stamina (for attacks)';
      default:
        return '';
    }
  };

  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 neon-text">Skill Allocation</h2>
      <p className="text-xs text-shade-red-300 mb-3 bg-shade-black-800 p-2 rounded neon-border">
        These spend the <span className="text-shade-red-100">same unspent points</span> as the Dashboard.
        Spend them here for <span className="text-shade-red-100">bonus</span> attack/defense/HP, or on the
        Dashboard for your core ATK/DEF/SPD/HP. Battles use both.
      </p>
      <p className="text-shade-red-200 mb-4">
        Unspent Points: <span className="text-shade-red-600 font-bold text-xl">{remaining}</span>
        {availablePoints === 0 && (
          <span className="text-xs text-shade-red-400 block">You've spent all your points. Earn more by leveling up.</span>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.entries(skills).map(([skill, value]) => (
          <div key={skill} className="neon-border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="capitalize font-semibold text-lg text-shade-red-100">{skill}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSkillChange(skill as keyof typeof skills, value - 1)}
                  className="px-3 py-1 bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow transition-all rounded"
                >
                  -
                </button>
                <input
                  type="number"
                  value={value}
                  onChange={e => handleSkillChange(skill as keyof typeof skills, parseInt(e.target.value) || 0)}
                  className="w-20 text-center p-2 rounded bg-shade-black-600 neon-border text-shade-red-100"
                  min="0"
                  max={availablePoints}
                />
                <button
                  type="button"
                  onClick={() => handleSkillChange(skill as keyof typeof skills, value + 1)}
                  className="px-3 py-1 bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow transition-all rounded"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-sm text-shade-red-300">{getSkillInfo(skill)}</p>
            <p className="text-sm text-shade-red-400 mt-1">
              Current: {character[`${skill}_skill_points`] || 0} → New: {(character[`${skill}_skill_points`] || 0) + value}
            </p>
          </div>
        ))}

        {error && <p className="text-shade-red-600">{error}</p>}

        <button
          type="submit"
          disabled={totalAllocated === 0}
          className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all disabled:bg-shade-black-600 disabled:text-shade-red-300 p-3 rounded font-bold"
        >
          Allocate {totalAllocated} Point{totalAllocated !== 1 ? 's' : ''}
        </button>
      </form>
    </div>
  );
}

// Clan Management UI
function ClanManagement({ characterId, onUpdate }: { characterId?: string | null; onUpdate: () => void }) {
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
    <div className="beveled-panel rounded-lg p-6 mb-6">
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
                className="flex-1 bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded font-bold"
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

// Ability Shop UI
function AbilityShop({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const characterLevel = character?.level ?? 0;
  const [abilities, setAbilities] = useState<any[]>([]);
  const [ownedAbilities, setOwnedAbilities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'owned'>('shop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAbilities = async () => {
    try {
      const [shopRes, ownedRes] = await Promise.all([
        apiClient.get<{ data: any[] }>(withChar('/storm8/abilities', character?.id)),
        apiClient.get<{ data: any[] }>(withChar('/storm8/abilities/owned', character?.id)),
      ]);
      setAbilities(shopRes.data || []);
      setOwnedAbilities(ownedRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbilities();
  }, []);

  const handlePurchase = async (abilityId: string) => {
    setError(null);
    try {
      await apiClient.post(withChar('/storm8/abilities/purchase', character?.id), { ability_id: abilityId });
      fetchAbilities();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to purchase ability');
    }
  };

  if (loading) return <div>Loading abilities...</div>;

  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 neon-text">Ability Shop</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 p-2 rounded transition-all ${activeTab === 'shop' ? 'bg-shade-black-900 neon-border text-shade-red-600 neon-glow' : 'bg-shade-black-600 neon-border text-shade-red-300 hover:neon-glow'}`}
        >
          Shop
        </button>
        <button
          onClick={() => setActiveTab('owned')}
          className={`flex-1 p-2 rounded transition-all ${activeTab === 'owned' ? 'bg-shade-black-900 neon-border text-shade-red-600 neon-glow' : 'bg-shade-black-600 neon-border text-shade-red-300 hover:neon-glow'}`}
        >
          Owned ({ownedAbilities.length})
        </button>
      </div>

      {error && <p className="text-shade-red-600 mb-4">{error}</p>}

      {activeTab === 'shop' ? (
        <div className="space-y-3">
          {abilities.length === 0 ? (
            <p className="text-shade-red-300">No abilities available at your level</p>
          ) : (
            abilities.map(ability => (
              <div key={ability.id} className="neon-border rounded p-4 hover:neon-glow transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-shade-red-100">{ability.name}</h3>
                    <p className="text-sm text-shade-red-300">{ability.category}</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(ability.id)}
                    className="bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all px-4 py-2 rounded font-bold"
                  >
                    Buy {ability.cost}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-600">ATK:</span> +{ability.attack_value}
                  </div>
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-400">DEF:</span> +{ability.defense_value}
                  </div>
                </div>
                {ability.description && (
                  <p className="text-xs text-shade-red-300 mt-2">{ability.description}</p>
                )}
                <p className="text-xs text-shade-red-400 mt-2">
                  Requires level {ability.level_requirement}
                  {characterLevel >= ability.level_requirement
                    ? <span className="text-green-500"> — ✓ you qualify</span>
                    : <span className="text-shade-red-600"> — locked (you are {characterLevel})</span>}
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {ownedAbilities.length === 0 ? (
            <p className="text-shade-red-300">You don't own any abilities yet</p>
          ) : (
            ownedAbilities.map((ability, idx) => (
              <div key={idx} className="neon-border rounded p-4 hover:neon-glow transition-all">
                <h3 className="font-bold text-shade-red-100">{ability.name}</h3>
                <p className="text-sm text-shade-red-300 mb-2">{ability.category}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-600">ATK:</span> +{ability.attack_value}
                  </div>
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-400">DEF:</span> +{ability.defense_value}
                  </div>
                </div>
                <p className="text-xs text-shade-red-600 mt-2">✓ Owned (Qty: {ability.quantity || 1})</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Shows the stats that actually drive combat, so it's clear what matters.
function BattleStats({ character }: { character: any }) {
  const cur = character.current_health ?? 0;
  const max = character.max_health ?? 1;
  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-2 neon-text">Your Battle Stats</h2>
      <p className="text-xs text-shade-red-300 mb-3">These drive your damage and survivability. Allocate on the Dashboard.</p>
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        {[['ATK', character.atk], ['DEF', character.def], ['SPD', character.spd], ['Class', character.class]].map(([label, val]) => (
          <div key={label as string} className="bg-shade-black-800 rounded p-2 neon-border">
            <div className="text-[10px] uppercase text-shade-red-400">{label}</div>
            <div className="text-shade-red-100 font-semibold truncate">{val ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm text-shade-red-200 mb-1">
        <span>Health</span>
        <span>{cur.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <HpBar current={cur} max={max} />
      {cur <= 0 && (
        <p className="text-xs text-shade-red-600 mt-2">💀 Defeated — heal at the hospital to fight again.</p>
      )}
    </div>
  );
}

// Attack interface — the resolved battle pops up in the global arena overlay.
function AttackInterface({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const { showBattle } = useBattleResult();
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attacking, setAttacking] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);

  // Load attackable players so the user can pick a target instead of pasting an ID.
  useEffect(() => {
    apiClient.get<{ data: any[] }>('/game/characters')
      .then(r => setTargets(r.data || []))
      .catch(() => {});
  }, []);

  const handleAttack = async () => {
    setError(null);
    if (!targetId.trim()) {
      setError('Choose a target');
      return;
    }
    setAttacking(true);
    try {
      const res = await apiClient.post<{ data: any }>(withChar('/storm8/attack', character?.id), { defender_character_id: targetId.trim() });
      showBattle(res.data);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Attack failed');
    } finally {
      setAttacking(false);
    }
  };

  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 neon-text">Attack</h2>

      <div className="bg-shade-black-600 neon-border p-4 rounded mb-4">
        <div className="flex justify-between items-center">
          <span className="text-shade-red-200">Stamina</span>
          <span className="text-2xl font-bold text-shade-red-600">
            {character.current_stamina} / {character.max_stamina}
          </span>
        </div>
        <div className="w-full bg-shade-black-900 rounded-full h-3 mt-2 neon-border">
          <div
            className="bg-shade-red-600 h-3 rounded-full transition-all neon-glow"
            style={{ width: `${(character.current_stamina / character.max_stamina) * 100}%` }}
          />
        </div>
        <p className="text-xs text-shade-red-300 mt-2">Regenerates 1 per 3 minutes</p>
      </div>

      <div className="space-y-3">
        {targets.length > 0 && (
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full p-3 rounded bg-shade-black-600 neon-border text-shade-red-100"
          >
            <option value="">— Choose a target —</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>
                {t.gamertag} (Lv.{t.level} {t.class})
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          placeholder={targets.length > 0 ? '…or paste a target character ID' : 'Enter target character ID'}
          className="w-full p-3 rounded bg-shade-black-600 neon-border text-shade-red-100 placeholder-shade-red-400"
        />

        <button
          onClick={handleAttack}
          disabled={character.current_stamina < 1 || attacking || !targetId.trim()}
          className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all disabled:bg-shade-black-600 disabled:text-shade-red-300 p-3 rounded font-bold text-lg"
        >
          {attacking ? 'Attacking…' : '⚔️ ATTACK (Costs 1 Stamina)'}
        </button>

        {error && <p className="text-shade-red-600">{error}</p>}
      </div>
    </div>
  );
}

// Hitlist Browser
function HitlistBrowser({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const { showBattle } = useBattleResult();
  const [hitlist, setHitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postTarget, setPostTarget] = useState('');
  const [bountyAmount, setBountyAmount] = useState(1000);

  const fetchHitlist = async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>('/storm8/hitlist/active');
      setHitlist(res.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHitlist();
  }, []);

  const handlePostHitlist = async () => {
    setError(null);
    if (!postTarget.trim()) {
      setError('Enter a target character ID');
      return;
    }
    try {
      await apiClient.post(withChar('/storm8/hitlist/post', character?.id), {
        target_character_id: postTarget,
        bounty_amount: bountyAmount,
      });
      setPostTarget('');
      fetchHitlist();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to post hitlist');
    }
  };

  const handleHitlistAttack = async (hitlistId: string) => {
    setError(null);
    try {
      const res = await apiClient.post<{ data: any }>(withChar('/storm8/hitlist/attack', character?.id), { hitlist_id: hitlistId });
      showBattle(res.data);
      fetchHitlist();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Hitlist attack failed');
    }
  };

  if (loading) return <div>Loading hitlist...</div>;

  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 neon-text">Hitlist</h2>

      <div className="bg-shade-black-600 neon-border p-4 rounded mb-4">
        <h3 className="font-bold mb-3 text-shade-red-100">Post a Bounty</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={postTarget}
            onChange={e => setPostTarget(e.target.value)}
            placeholder="Target character ID"
            className="w-full p-2 rounded bg-shade-black-900 neon-border text-shade-red-100 placeholder-shade-red-400"
          />
          <input
            type="number"
            value={bountyAmount}
            onChange={e => setBountyAmount(Math.max(100, parseInt(e.target.value) || 100))}
            placeholder="Bounty amount"
            className="w-full p-2 rounded bg-shade-black-900 neon-border text-shade-red-100 placeholder-shade-red-400"
            min="100"
          />
          <button
            onClick={handlePostHitlist}
            className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded font-bold"
          >
            Post Bounty ({bountyAmount} currency)
          </button>
        </div>
      </div>

      {error && <p className="text-shade-red-600 mb-4">{error}</p>}

      <div className="space-y-3">
        <h3 className="font-bold text-shade-red-100">Active Bounties</h3>
        {hitlist.length === 0 ? (
          <p className="text-shade-red-300">No active bounties</p>
        ) : (
          hitlist.map(hit => (
            <div key={hit.id} className="neon-border rounded p-4 bg-shade-red-900 bg-opacity-20 hover:neon-glow transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-shade-red-100">Target: {hit.target_gamertag || hit.target_character_id}</p>
                  <p className="text-sm text-shade-red-300">Posted by: {hit.poster_gamertag}</p>
                  <p className="text-sm text-shade-red-400">Current HP: {hit.target_current_health}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-shade-red-600">{hit.bounty_amount}</p>
                  <p className="text-xs text-shade-red-300">bounty</p>
                </div>
              </div>
              <button
                onClick={() => handleHitlistAttack(hit.id)}
                disabled={character.current_stamina < 1}
                className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all disabled:bg-shade-black-600 disabled:text-shade-red-300 p-2 rounded font-bold"
              >
                Attack (1 Stamina)
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Battle Feed Display
function BattleFeed({ characterId }: { characterId?: string | null }) {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>(withChar('/storm8/feed', characterId));
      setFeed(res.data || []);
    } catch (err) {
      console.error('Failed to fetch battle feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  if (loading) return <div>Loading battle feed...</div>;

  return (
    <div className="beveled-panel rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 neon-text">Battle Feed</h2>

      <div className="space-y-2">
        {feed.length === 0 ? (
          <p className="text-shade-red-300">No recent battles</p>
        ) : (
          feed.map((battle, idx) => (
            <div
              key={idx}
              className={`p-3 rounded neon-border transition-all ${
                battle.attacker_won
                  ? 'bg-shade-red-900 bg-opacity-20 hover:neon-glow'
                  : 'bg-shade-red-900 bg-opacity-20 hover:neon-glow'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-shade-red-100">
                    {battle.attacker_won ? '✓ Victory' : '✗ Defeat'} vs {battle.defender_gamertag}
                  </p>
                  <p className="text-sm text-shade-red-300">
                    Damage: {battle.damage_dealt} | Stolen: {battle.currency_stolen}
                  </p>
                </div>
                <span className="text-xs text-shade-red-400">
                  {new Date(battle.created_at).toLocaleString()}
                </span>
              </div>
              {battle.defender_killed && (
                <p className="text-sm text-shade-red-600 mt-2">💀 KILLED</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main Storm8 Page
export default function Storm8Page() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>('/game/my-characters');
      const list = (res.data || []).filter((ch) => ch.first_game_access_completed);
      setCharacters(list);
      setSelectedId((prev) => (prev && list.some((ch) => ch.id === prev) ? prev : list[0]?.id ?? null));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const character = characters.find((ch) => ch.id === selectedId) ?? null;

  if (loading) return <div className="p-4 text-shade-red-200">Loading...</div>;
  if (error) return <div className="p-4 text-shade-red-600">Error: {error}</div>;
  if (!character) return <div className="p-4 text-shade-red-300">No character found. Create one on the Dashboard.</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold neon-text">Storm8 Battle System</h1>
        {/* Character selector: choose which of your characters fights/builds */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-shade-red-300">Fighting as:</span>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="p-2 rounded bg-shade-black-600 neon-border text-shade-red-100"
          >
            {characters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.gamertag} — Slot {ch.slot_number} (Lv.{ch.level} {ch.class})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keyed by selectedId so panels refetch when you switch characters */}
      <div className="grid md:grid-cols-2 gap-6" key={selectedId}>
        {/* Left Column */}
        <div>
          <SkillAllocation character={character} onUpdate={fetchCharacters} />
          <ClanManagement characterId={character.id} onUpdate={fetchCharacters} />
          <AbilityShop character={character} onUpdate={fetchCharacters} />
        </div>

        {/* Right Column */}
        <div>
          <BattleStats character={character} />
          <AttackInterface character={character} onUpdate={fetchCharacters} />
          <HitlistBrowser character={character} onUpdate={fetchCharacters} />
          <BattleFeed characterId={character.id} />
        </div>
      </div>
    </div>
  );
}
