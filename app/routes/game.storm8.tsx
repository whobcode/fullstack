import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

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

  const availablePoints = character.level * 5 - (
    character.attack_skill_points +
    character.defense_skill_points +
    character.health_skill_points +
    character.energy_skill_points +
    character.stamina_skill_points
  );

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
      await apiClient.post('/storm8/skills/allocate', skills);
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
      <p className="text-shade-red-200 mb-4">
        Available Points: <span className="text-shade-red-600 font-bold text-xl">{remaining}</span>
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
function ClanManagement({ onUpdate }: { onUpdate: () => void }) {
  const [clanData, setClanData] = useState<any>(null);
  const [recruitCount, setRecruitCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClan = async () => {
    try {
      const res = await apiClient.get<{ data: any }>('/storm8/clan');
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
      await apiClient.post('/storm8/clan/recruit', { count: recruitCount });
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
function AbilityShop({ onUpdate }: { onUpdate: () => void }) {
  const [abilities, setAbilities] = useState<any[]>([]);
  const [ownedAbilities, setOwnedAbilities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'owned'>('shop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAbilities = async () => {
    try {
      const [shopRes, ownedRes] = await Promise.all([
        apiClient.get<{ data: any[] }>('/storm8/abilities'),
        apiClient.get<{ data: any[] }>('/storm8/abilities/owned'),
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
      await apiClient.post('/storm8/abilities/purchase', { ability_id: abilityId });
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
                    <span className="text-shade-red-600">ATK:</span> +{ability.attack_bonus}
                  </div>
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-400">DEF:</span> +{ability.defense_bonus}
                  </div>
                </div>
                <p className="text-xs text-shade-red-400 mt-2">Level {ability.level_required} required</p>
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
                    <span className="text-shade-red-600">ATK:</span> +{ability.attack_bonus}
                  </div>
                  <div className="bg-shade-red-900 bg-opacity-30 p-2 rounded neon-border">
                    <span className="text-shade-red-400">DEF:</span> +{ability.defense_bonus}
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

// Attack Buttons with Stamina Display
function AttackInterface({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAttack = async () => {
    setError(null);
    setSuccess(null);
    if (!targetId.trim()) {
      setError('Enter a target character ID');
      return;
    }
    try {
      const res = await apiClient.post<{ damage_dealt: number }>('/storm8/attack', { defender_character_id: targetId });
      setSuccess(`Attack successful! Dealt ${res.damage_dealt} damage`);
      setTargetId('');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Attack failed');
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
        <input
          type="text"
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          placeholder="Enter target character ID"
          className="w-full p-3 rounded bg-shade-black-600 neon-border text-shade-red-100 placeholder-shade-red-400"
        />

        <button
          onClick={handleAttack}
          disabled={character.current_stamina < 1}
          className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all disabled:bg-shade-black-600 disabled:text-shade-red-300 p-3 rounded font-bold text-lg"
        >
          ⚔️ ATTACK (Costs 1 Stamina)
        </button>

        {error && <p className="text-shade-red-600">{error}</p>}
        {success && <p className="text-shade-red-600">{success}</p>}
      </div>
    </div>
  );
}

// Hitlist Browser
function HitlistBrowser({ character, onUpdate }: { character: any; onUpdate: () => void }) {
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
      await apiClient.post('/storm8/hitlist/post', {
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
      const res = await apiClient.post<{ bounty_claimed?: boolean; bounty_amount?: number; damage_dealt?: number }>('/storm8/hitlist/attack', { hitlist_id: hitlistId });
      alert(`Attack successful! ${res.bounty_claimed ? `You claimed the ${res.bounty_amount} bounty!` : `Dealt ${res.damage_dealt} damage`}`);
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
function BattleFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>('/storm8/feed');
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
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacter = async () => {
    try {
      const res = await apiClient.get<{ data: any }>('/game/character');
      setCharacter(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, []);

  if (loading) return <div className="p-4 text-shade-red-200">Loading...</div>;
  if (error) return <div className="p-4 text-shade-red-600">Error: {error}</div>;
  if (!character) return <div className="p-4 text-shade-red-300">No character found</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 neon-text">Storm8 Battle System</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div>
          <SkillAllocation character={character} onUpdate={fetchCharacter} />
          <ClanManagement onUpdate={fetchCharacter} />
          <AbilityShop onUpdate={fetchCharacter} />
        </div>

        {/* Right Column */}
        <div>
          <AttackInterface character={character} onUpdate={fetchCharacter} />
          <HitlistBrowser character={character} onUpdate={fetchCharacter} />
          <BattleFeed />
        </div>
      </div>
    </div>
  );
}
