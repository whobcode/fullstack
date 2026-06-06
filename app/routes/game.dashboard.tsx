import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { SquarePayment } from '../components/SquarePayment';

type SlotInfo = {
  totalSlots: number;
  freeSlots: number;
  availableSlots: number[];
  characters: CharacterSlot[];
  slotPrices: Record<number, number>;
  isSpecialAccount: boolean;
  canCreateMore: boolean;
};

type CharacterSlot = {
  id: string;
  slot_number: number;
  gamertag: string | null;
  class: string | null;
  level: number;
  first_game_access_completed: boolean;
};

type Character = {
  id: string;
  slot_number: number;
  gamertag: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  atk: number;
  def: number;
  mp: number;
  spd: number;
  unspent_stat_points: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  first_game_access_completed: boolean;
};

// Character slot selector component
function CharacterSlotSelector({
  slotInfo,
  selectedCharacterId,
  onSelectCharacter,
  onCreateNew,
  onPurchaseSlot,
}: {
  slotInfo: SlotInfo;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  onCreateNew: (slot: number) => void;
  onPurchaseSlot: (slot: number) => void;
}) {
  const slots = [];

  for (let i = 1; i <= slotInfo.totalSlots; i++) {
    const char = slotInfo.characters.find(c => c.slot_number === i);
    const isAvailable = slotInfo.availableSlots.includes(i);
    const needsPurchase = i > slotInfo.freeSlots && !isAvailable;
    const price = slotInfo.slotPrices[i];

    slots.push(
      <div
        key={i}
        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
          char && selectedCharacterId === char.id
            ? 'border-shade-red-500 bg-shade-black-700 neon-glow'
            : char
            ? 'border-shade-red-800 bg-shade-black-800 hover:border-shade-red-600'
            : isAvailable
            ? 'border-shade-black-600 bg-shade-black-900 hover:border-shade-red-700 border-dashed'
            : 'border-shade-black-700 bg-shade-black-950 opacity-60'
        }`}
        onClick={() => {
          if (char && char.first_game_access_completed) {
            onSelectCharacter(char.id);
          } else if (char && !char.first_game_access_completed) {
            onSelectCharacter(char.id);
          } else if (isAvailable) {
            onCreateNew(i);
          } else if (needsPurchase) {
            onPurchaseSlot(i);
          }
        }}
      >
        <div className="text-xs text-shade-red-400 mb-1">Slot {i}</div>
        {char ? (
          <>
            <div className="font-bold text-shade-red-100">{char.gamertag || 'Setup Required'}</div>
            <div className="text-sm text-shade-red-300">
              {char.class ? `${char.class} Lv.${char.level}` : 'Incomplete'}
            </div>
          </>
        ) : isAvailable ? (
          <div className="text-shade-red-400 text-sm">+ Create New</div>
        ) : (
          <div className="text-shade-black-500 text-sm">
            Locked - ${(price / 100).toFixed(2)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold neon-text mb-3">Character Slots</h2>
      {slotInfo.isSpecialAccount && (
        <div className="mb-2 text-xs text-shade-red-400 bg-shade-black-800 p-2 rounded">
          ⭐ Special Account - All slots unlocked, characters start at max level!
        </div>
      )}
      <div className="grid grid-cols-7 gap-2">{slots}</div>
    </div>
  );
}

// New character creation form
function CreateCharacterForm({
  slotNumber,
  onComplete,
  onCancel,
}: {
  slotNumber: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [gamertag, setGamertag] = useState('');
  const [selectedClass, setSelectedClass] = useState('phoenix');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/game/characters/create', {
        gamertag,
        class: selectedClass,
        slotNumber,
      });
      onComplete();
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'An error occurred');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 beveled-panel">
      <h2 className="text-xl font-bold mb-4 neon-text">Create Character (Slot {slotNumber})</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-shade-red-100">Gamertag</label>
          <input
            type="text"
            value={gamertag}
            onChange={(e) => setGamertag(e.target.value)}
            className="w-full p-2 rounded beveled-panel hover:neon-glow transition-all"
            required
            minLength={3}
            maxLength={20}
            pattern="^[a-zA-Z0-9_-]+$"
          />
          <p className="text-xs text-shade-red-400 mt-1">3-20 characters, letters, numbers, _ and - only</p>
        </div>
        <div>
          <label className="block text-shade-red-100">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 rounded beveled-panel hover:neon-glow transition-all"
          >
            <option value="phoenix">Phoenix Rider</option>
            <option value="dphoenix">Dark Phoenix Rider</option>
            <option value="dragon">Dragon Rider</option>
            <option value="ddragon">Dark Dragon Rider</option>
            <option value="kies">Kies Warrior</option>
          </select>
        </div>
        {error && <p className="text-shade-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-shade-black-700 border border-shade-red-800 text-shade-red-400 hover:bg-shade-black-600 transition-all p-2 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Character'}
          </button>
        </div>
      </form>
    </div>
  );
}

// First access wizard for existing incomplete character
function FirstAccessWizard({
  characterId,
  onSetupComplete,
}: {
  characterId: string;
  onSetupComplete: () => void;
}) {
  const [gamertag, setGamertag] = useState('');
  const [selectedClass, setSelectedClass] = useState('phoenix');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/game/first-access', { gamertag, class: selectedClass });
      onSetupComplete();
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'An error occurred');
      setError(errorMsg);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 beveled-panel">
      <h2 className="text-xl font-bold mb-4 neon-text">Complete Character Setup</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-shade-red-100">Gamertag</label>
          <input
            type="text"
            value={gamertag}
            onChange={(e) => setGamertag(e.target.value)}
            className="w-full p-2 rounded beveled-panel hover:neon-glow transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-shade-red-100">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 rounded beveled-panel hover:neon-glow transition-all"
          >
            <option value="phoenix">Phoenix Rider</option>
            <option value="dphoenix">Dark Phoenix Rider</option>
            <option value="dragon">Dragon Rider</option>
            <option value="ddragon">Dark Dragon Rider</option>
            <option value="kies">Kies Warrior</option>
          </select>
        </div>
        {error && <p className="text-shade-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded"
        >
          Create Character
        </button>
      </form>
    </div>
  );
}

// Stat point allocation form
function AllocatePointsForm({
  character,
  onAllocationComplete,
}: {
  character: Character;
  onAllocationComplete: () => void;
}) {
  const [points, setPoints] = useState({ hp: 0, atk: 0, def: 0, spd: 0 });
  const [error, setError] = useState<string | null>(null);

  const STAT_META: Record<string, { label: string; hint: string; accent: string; ring: string }> = {
    hp:  { label: 'HP',  hint: '+100 / pt',     accent: 'text-emerald-400', ring: 'focus:ring-emerald-400' },
    atk: { label: 'ATK', hint: '+1% base / pt', accent: 'text-rose-400',    ring: 'focus:ring-rose-400' },
    def: { label: 'DEF', hint: '+1% base / pt', accent: 'text-sky-400',     ring: 'focus:ring-sky-400' },
    spd: { label: 'SPD', hint: '+2 / pt',       accent: 'text-amber-400',   ring: 'focus:ring-amber-400' },
  };

  const totalAllocated = Object.values(points).reduce((sum, p) => sum + p, 0);

  const handlePointChange = (stat: keyof typeof points, value: number) => {
    const newValue = Math.max(0, value);
    const currentTotal = totalAllocated - (points[stat] || 0);
    if (currentTotal + newValue > character.unspent_stat_points) {
      return;
    }
    setPoints((prev) => ({ ...prev, [stat]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (totalAllocated === 0) {
      setError('Allocate at least one point.');
      return;
    }
    try {
      await apiClient.post('/game/character/allocate-points', { characterId: character.id, ...points });
      setPoints({ hp: 0, atk: 0, def: 0, spd: 0 });
      onAllocationComplete();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-700/60 shadow-[0_0_25px_rgba(255,42,42,0.15)]">
      <h3 className="text-lg font-bold neon-text">
        {character.unspent_stat_points - totalAllocated} unspent stat points
      </h3>
      <p className="text-xs text-shade-red-400 mt-1 mb-3">Spend them to power up. Gains shown per point.</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        {(Object.keys(points) as (keyof typeof points)[]).map((stat) => (
          <div key={stat} className="flex items-center justify-between gap-3 bg-shade-black-800/60 rounded-lg px-3 py-2 border border-white/5">
            <div className="flex items-baseline gap-2">
              <span className={`font-bold ${STAT_META[stat].accent}`}>{STAT_META[stat].label}</span>
              <span className="text-[10px] text-shade-red-400/80">{STAT_META[stat].hint}</span>
            </div>
            <input
              type="number"
              min={0}
              value={points[stat]}
              onChange={(e) => handlePointChange(stat, parseInt(e.target.value, 10) || 0)}
              className={`w-24 p-1.5 rounded bg-shade-black-950 border border-white/10 text-shade-red-100 focus:outline-none focus:ring-2 ${STAT_META[stat].ring}`}
            />
          </div>
        ))}
        {error && <p className="text-shade-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white font-bold p-2.5 rounded-lg mt-2 hover:from-shade-red-600 hover:to-shade-red-400 transition-all shadow-lg shadow-shade-red-900/40"
        >
          Allocate {totalAllocated > 0 ? `${totalAllocated} ` : ''}Points
        </button>
      </form>
    </div>
  );
}

// Story mode placeholder
function StoryModePlaceholder() {
  return (
    <div className="p-6 beveled-panel text-center">
      <div className="text-4xl mb-4">📖</div>
      <h2 className="text-2xl font-bold neon-text mb-2">Story Mode</h2>
      <p className="text-shade-red-300 mb-4">Coming Soon!</p>
      <p className="text-shade-red-400 text-sm">
        An epic adventure awaits. The story is being written...
      </p>
      <div className="mt-4 text-shade-black-500 text-xs">Check back later for updates</div>
    </div>
  );
}

// Purchase slot confirmation modal with Square Payment
function PurchaseSlotModal({
  slotNumber,
  price,
  onSuccess,
  onCancel,
}: {
  slotNumber: number;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const handlePaymentSuccess = (paymentId: string, receipt?: string) => {
    setPaymentSuccess(true);
    if (receipt) setReceiptUrl(receipt);
    // Auto-close after showing success
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="beveled-panel p-6 max-w-sm w-full mx-4 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold neon-text mb-2">Payment Successful!</h2>
          <p className="text-shade-red-200 mb-4">
            Slot {slotNumber} has been unlocked.
          </p>
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-shade-red-400 hover:text-shade-red-300 underline"
            >
              View Receipt
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="beveled-panel p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold neon-text mb-4">Unlock Slot {slotNumber}</h2>
        <SquarePayment
          amount={price}
          slotNumber={slotNumber}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

export default function GameDashboardPage() {
  const { user } = useAuth();
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battles, setBattles] = useState<any[]>([]);
  const [view, setView] = useState<'dashboard' | 'create' | 'setup' | 'story'>('dashboard');
  const [createSlot, setCreateSlot] = useState<number>(1);
  const [purchaseModal, setPurchaseModal] = useState<{ slot: number; price: number } | null>(null);

  const fetchSlotInfo = async () => {
    try {
      const res = await apiClient.get<{ data: SlotInfo }>('/game/slots');
      setSlotInfo(res.data);

      // Auto-select first completed character
      const completedChar = res.data.characters.find((c) => c.first_game_access_completed);
      if (completedChar && !selectedCharacterId) {
        setSelectedCharacterId(completedChar.id);
      }

      // Check if there's an incomplete character that needs setup
      const incompleteChar = res.data.characters.find((c) => !c.first_game_access_completed);
      if (incompleteChar && !completedChar) {
        setSelectedCharacterId(incompleteChar.id);
        setView('setup');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCharacter = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Character }>(`/game/character/${id}`);
      setCharacter(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBattles = async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>('/game/battles');
      setBattles(res.data);
    } catch (err) {
      console.error('Failed to fetch battles', err);
    }
  };

  useEffect(() => {
    fetchSlotInfo().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCharacterId) {
      fetchCharacter(selectedCharacterId);
      fetchBattles();
    }
  }, [selectedCharacterId]);

  const handleSelectCharacter = (id: string) => {
    const char = slotInfo?.characters.find((c) => c.id === id);
    if (char && !char.first_game_access_completed) {
      setSelectedCharacterId(id);
      setView('setup');
    } else {
      setSelectedCharacterId(id);
      setView('dashboard');
    }
  };

  const handleCreateNew = (slot: number) => {
    setCreateSlot(slot);
    setView('create');
  };

  const handlePurchaseSlot = (slot: number) => {
    if (slotInfo?.slotPrices[slot]) {
      setPurchaseModal({ slot, price: slotInfo.slotPrices[slot] });
    }
  };

  const handleCharacterCreated = () => {
    setView('dashboard');
    fetchSlotInfo().then(() => {
      // Select the newly created character
      if (slotInfo) {
        const newChar = slotInfo.characters.find((c) => c.slot_number === createSlot);
        if (newChar) {
          setSelectedCharacterId(newChar.id);
        }
      }
    });
  };

  const handleSetupComplete = () => {
    setView('dashboard');
    fetchSlotInfo();
    if (selectedCharacterId) {
      fetchCharacter(selectedCharacterId);
    }
  };

  const handleRespec = async (charId: string) => {
    if (!confirm('Reset all stat points? Your character returns to base stats and every point is refunded to re-allocate.')) {
      return;
    }
    try {
      await apiClient.post('/game/character/respec', { characterId: charId });
      await fetchCharacter(charId);
    } catch (err: any) {
      setError(err.message || 'Failed to reset points');
    }
  };

  if (loading && !slotInfo) return <div className="neon-text">Loading...</div>;
  if (error) return <div className="text-shade-red-600">Error: {error}</div>;

  // Create new character view
  if (view === 'create') {
    return (
      <div>
        <CreateCharacterForm
          slotNumber={createSlot}
          onComplete={handleCharacterCreated}
          onCancel={() => setView('dashboard')}
        />
      </div>
    );
  }

  // Setup incomplete character view
  if (view === 'setup' && selectedCharacterId) {
    return (
      <div>
        <FirstAccessWizard characterId={selectedCharacterId} onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  // Story mode view
  if (view === 'story') {
    return (
      <div>
        {slotInfo && (
          <CharacterSlotSelector
            slotInfo={slotInfo}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={handleSelectCharacter}
            onCreateNew={handleCreateNew}
            onPurchaseSlot={handlePurchaseSlot}
          />
        )}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('dashboard')}
            className="px-4 py-2 bg-shade-black-800 border border-shade-red-800 text-shade-red-400 rounded hover:border-shade-red-600 transition-all"
          >
            Dashboard
          </button>
          <button
            className="px-4 py-2 bg-shade-black-700 neon-border text-shade-red-500 rounded"
          >
            Story Mode
          </button>
        </div>
        <StoryModePlaceholder />
      </div>
    );
  }

  // Main dashboard view
  return (
    <div>
      {purchaseModal && (
        <PurchaseSlotModal
          slotNumber={purchaseModal.slot}
          price={purchaseModal.price}
          onSuccess={() => {
            setPurchaseModal(null);
            fetchSlotInfo(); // Refresh slot info after purchase
          }}
          onCancel={() => setPurchaseModal(null)}
        />
      )}

      {slotInfo && (
        <CharacterSlotSelector
          slotInfo={slotInfo}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={handleSelectCharacter}
          onCreateNew={handleCreateNew}
          onPurchaseSlot={handlePurchaseSlot}
        />
      )}

      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white shadow-lg shadow-shade-red-900/40"
        >
          Dashboard
        </button>
        <Link
          to="/shade/profile"
          className="px-4 py-2 rounded-lg bg-shade-black-800 border border-shade-red-800/60 text-shade-red-300 hover:border-fuchsia-500/60 hover:text-fuchsia-300 transition-all"
        >
          Gamer Profile
        </Link>
        <button
          onClick={() => setView('story')}
          className="px-4 py-2 rounded-lg bg-shade-black-800 border border-shade-red-800/60 text-shade-red-300 hover:border-amber-500/60 hover:text-amber-300 transition-all"
        >
          Story Mode
        </button>
      </div>

      {character && character.first_game_access_completed ? (
        <>
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/shade/profile"
              className="w-14 h-14 rounded-full overflow-hidden silhouette-avatar breathing-glow flex items-center justify-center shrink-0"
              title="View gamer profile"
            >
              {user?.shade_avatar_url ? (
                <img src={user.shade_avatar_url} alt="Shade avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl neon-text">{character.gamertag?.charAt(0).toUpperCase()}</span>
              )}
            </Link>
            <h1 className="text-2xl font-bold neon-text">Welcome, {character.gamertag}!</h1>
          </div>
          {character.unspent_stat_points > 0 && (
            <AllocatePointsForm
              character={character}
              onAllocationComplete={() => fetchCharacter(character.id)}
            />
          )}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60 shadow-[0_0_25px_rgba(255,42,42,0.12)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold neon-text">Stats</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-shade-red-900/40 text-shade-red-200 border border-shade-red-700/50 capitalize">{character.class} • Lv.{character.level}</span>
              </div>
              <p className="text-xs text-shade-red-400 mb-3">{character.xp.toLocaleString()} XP</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'HP', val: character.hp, accent: 'from-emerald-600/30 to-emerald-900/10 text-emerald-300' },
                  { label: 'ATK', val: character.atk, accent: 'from-rose-600/30 to-rose-900/10 text-rose-300' },
                  { label: 'DEF', val: character.def, accent: 'from-sky-600/30 to-sky-900/10 text-sky-300' },
                  { label: 'SPD', val: character.spd, accent: 'from-amber-600/30 to-amber-900/10 text-amber-300' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg p-3 bg-gradient-to-br ${s.accent} border border-white/10`}>
                    <div className="text-[10px] uppercase tracking-wider opacity-80">{s.label}</div>
                    <div className="text-lg font-bold">{s.val.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <p className="text-shade-red-200 mt-3 text-sm">
                Unspent points: <span className="font-bold text-shade-red-100">{character.unspent_stat_points.toLocaleString()}</span>
              </p>
              <button
                onClick={() => handleRespec(character.id)}
                className="mt-3 w-full bg-shade-black-950 border border-shade-red-700/60 text-shade-red-300 hover:bg-shade-red-900/30 hover:text-shade-red-100 transition-all px-3 py-2 rounded-lg text-sm font-bold"
              >
                ↺ Reset Points
              </button>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60">
              <h2 className="text-xl font-bold neon-text mb-3">Trophies</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Wins', val: character.wins, c: 'text-emerald-300' },
                  { label: 'Losses', val: character.losses, c: 'text-shade-red-300' },
                  { label: 'Kills', val: character.kills, c: 'text-fuchsia-300' },
                  { label: 'Deaths', val: character.deaths, c: 'text-sky-300' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg p-3 bg-shade-black-950/60 border border-white/10">
                    <div className="text-[10px] uppercase tracking-wider text-shade-red-400">{s.label}</div>
                    <div className={`text-lg font-bold ${s.c}`}>{s.val ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-xl col-span-2 bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60">
              <h2 className="text-xl font-bold neon-text">Active Battles</h2>
              <div className="space-y-2 mt-2">
                {battles.length > 0 ? (
                  battles.map((b) => (
                    <Link
                      to={`/shade/battles/${b.id}`}
                      key={b.id}
                      className="block p-2 bg-shade-black-600 neon-border hover:neon-glow transition-all rounded"
                    >
                      <p className="text-shade-red-100">
                        vs.{' '}
                        {b.defender_char_id === character.id
                          ? b.attacker_char_id
                          : b.defender_char_id}
                      </p>
                      <p className="text-sm text-shade-black-400">Status: {b.state}</p>
                    </Link>
                  ))
                ) : (
                  <p className="text-shade-red-100">No active battles.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-8 beveled-panel">
          <p className="text-shade-red-300">Select a character or create a new one to begin.</p>
        </div>
      )}
    </div>
  );
}
