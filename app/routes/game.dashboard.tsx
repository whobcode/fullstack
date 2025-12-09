import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

// A simple component for the first-time setup
function FirstAccessWizard({ onSetupComplete }: { onSetupComplete: () => void }) {
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
            const errorMsg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'An error occurred');
            setError(errorMsg);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 beveled-panel">
            <h2 className="text-xl font-bold mb-4 neon-text">Create Your Character</h2>
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
                <button type="submit" className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded">
                    Create Character
                </button>
            </form>
        </div>
    );
}

// A simple component for allocating stat points
function AllocatePointsForm({ character, onAllocationComplete }: { character: any, onAllocationComplete: () => void }) {
    const [points, setPoints] = useState({ hp: 0, atk: 0, def: 0, mp: 0, spd: 0 });
    const [error, setError] = useState<string | null>(null);

    const totalAllocated = Object.values(points).reduce((sum, p) => sum + p, 0);

    const handlePointChange = (stat: keyof typeof points, value: number) => {
        const newValue = Math.max(0, value);
        const currentTotal = totalAllocated - (points[stat] || 0);
        if (currentTotal + newValue > character.unspent_stat_points) {
            return; // Don't allow allocating more than available
        }
        setPoints(prev => ({ ...prev, [stat]: newValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (totalAllocated === 0) {
            setError("Allocate at least one point.");
            return;
        }
        try {
            await apiClient.post('/game/character/allocate-points', points);
            onAllocationComplete();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="mt-6 p-4 border border-shade-red-700 rounded">
            <h3 className="text-lg font-bold neon-text">You have {character.unspent_stat_points - totalAllocated} unspent stat points!</h3>
            <form onSubmit={handleSubmit} className="space-y-2 mt-2">
                {Object.keys(points).map(stat => (
                    <div key={stat} className="flex items-center justify-between">
                        <label className="uppercase text-shade-red-100">{stat}</label>
                        <input
                            type="number"
                            value={points[stat as keyof typeof points]}
                            onChange={e => handlePointChange(stat as keyof typeof points, parseInt(e.target.value, 10) || 0)}
                            className="w-24 p-1 rounded bg-shade-black-600 neon-border hover:neon-glow transition-all"
                        />
                    </div>
                ))}
                 {error && <p className="text-shade-red-600">{error}</p>}
                <button type="submit" className="w-full bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all p-2 rounded mt-2">
                    Allocate Points
                </button>
            </form>
        </div>
    );
}

export default function GameDashboardPage() {
    const [character, setCharacter] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [battles, setBattles] = useState<any[]>([]);

    const fetchCharacter = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<{data: any}>('/game/character');
            setCharacter(res.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCharacter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBattles = async () => {
        try {
            const res = await apiClient.get<{ data: any[] }>('/game/battles');
            setBattles(res.data);
        } catch (err) {
            console.error("Failed to fetch battles", err);
        }
    };

    useEffect(() => {
        if (character?.first_game_access_completed) {
            fetchBattles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character?.first_game_access_completed]);

    if (loading) return <div className="neon-text">Loading...</div>;
    if (error) return <div className="text-shade-red-600">Error: {error}</div>;

    if (!character || !character.first_game_access_completed) {
        return <FirstAccessWizard onSetupComplete={fetchCharacter} />;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 neon-text">Welcome, {character.gamertag}!</h1>
            {character.unspent_stat_points > 0 && (
                <AllocatePointsForm character={character} onAllocationComplete={fetchCharacter} />
            )}
            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 beveled-panel">
                    <h2 className="text-xl font-semibold neon-text">Stats</h2>
                    <p className="text-shade-red-100">Class: {character.class}</p>
                    <p className="text-shade-red-100">Level: {character.level} ({character.xp} XP)</p>
                    <p className="text-shade-red-100">HP: {character.hp}</p>
                    <p className="text-shade-red-100">ATK: {character.atk}</p>
                    <p className="text-shade-red-100">DEF: {character.def}</p>
                    <p className="text-shade-red-100">MP: {character.mp}</p>
                    <p className="text-shade-red-100">SPD: {character.spd}</p>
                    <p className="text-shade-red-100">Unspent Points: {character.unspent_stat_points}</p>
                </div>
                <div className="p-4 beveled-panel">
                    <h2 className="text-xl font-semibold neon-text">Trophies</h2>
                    <p className="text-shade-red-100">Wins: {character.wins}</p>
                    <p className="text-shade-red-100">Losses: {character.losses}</p>
                    <p className="text-shade-red-100">Kills: {character.kills}</p>
                    <p className="text-shade-red-100">Deaths: {character.deaths}</p>
                </div>
                <div className="p-4 beveled-panel col-span-2">
                     <h2 className="text-xl font-semibold neon-text">Active Battles</h2>
                     <div className="space-y-2 mt-2">
                        {battles.length > 0 ? battles.map(b => (
                            <Link to={`/shade/battles/${b.id}`} key={b.id} className="block p-2 bg-shade-black-600 neon-border hover:neon-glow transition-all rounded">
                                <p className="text-shade-red-100">vs. {b.defender_char_id === character.id ? b.attacker_char_id : b.defender_char_id}</p>
                                <p className="text-sm text-shade-black-400">Status: {b.state}</p>
                            </Link>
                        )) : <p className="text-shade-red-100">No active battles.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
}
