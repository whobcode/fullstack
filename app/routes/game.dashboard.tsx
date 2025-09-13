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
            setError(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 border border-gray-700 rounded">
            <h2 className="text-xl font-bold mb-4">Create Your Character</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block">Gamertag</label>
                    <input
                        type="text"
                        value={gamertag}
                        onChange={(e) => setGamertag(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                        required
                    />
                </div>
                <div>
                    <label className="block">Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                    >
                        <option value="phoenix">Phoenix Rider</option>
                        <option value="dphoenix">Dark Phoenix Rider</option>
                        <option value="dragon">Dragon Rider</option>
                        <option value="ddragon">Dark Dragon Rider</option>
                        <option value="kies">Kies Warrior</option>
                    </select>
                </div>
                {error && <p className="text-red-500">{error}</p>}
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded">
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
        <div className="mt-6 p-4 border border-green-700 rounded">
            <h3 className="text-lg font-bold">You have {character.unspent_stat_points - totalAllocated} unspent stat points!</h3>
            <form onSubmit={handleSubmit} className="space-y-2 mt-2">
                {Object.keys(points).map(stat => (
                    <div key={stat} className="flex items-center justify-between">
                        <label className="uppercase">{stat}</label>
                        <input
                            type="number"
                            value={points[stat as keyof typeof points]}
                            onChange={e => handlePointChange(stat as keyof typeof points, parseInt(e.target.value, 10) || 0)}
                            className="w-24 p-1 rounded bg-gray-700 border border-gray-600"
                        />
                    </div>
                ))}
                 {error && <p className="text-red-500">{error}</p>}
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white p-2 rounded mt-2">
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
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    if (!character || !character.first_game_access_completed) {
        return <FirstAccessWizard onSetupComplete={fetchCharacter} />;
    }

    const [battles, setBattles] = useState<any[]>([]);

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
    }, [character]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Welcome, {character.gamertag}!</h1>
            {character.unspent_stat_points > 0 && (
                <AllocatePointsForm character={character} onAllocationComplete={fetchCharacter} />
            )}
            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800 rounded">
                    <h2 className="text-xl font-semibold">Stats</h2>
                    <p>Class: {character.class}</p>
                    <p>Level: {character.level} ({character.xp} XP)</p>
                    <p>HP: {character.hp}</p>
                    <p>ATK: {character.atk}</p>
                    <p>DEF: {character.def}</p>
                    <p>MP: {character.mp}</p>
                    <p>SPD: {character.spd}</p>
                    <p>Unspent Points: {character.unspent_stat_points}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded">
                    <h2 className="text-xl font-semibold">Trophies</h2>
                    <p>Wins: {character.wins}</p>
                    <p>Losses: {character.losses}</p>
                    <p>Kills: {character.kills}</p>
                    <p>Deaths: {character.deaths}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded col-span-2">
                     <h2 className="text-xl font-semibold">Active Battles</h2>
                     <div className="space-y-2 mt-2">
                        {battles.length > 0 ? battles.map(b => (
                            <Link to={`/battles/${b.id}`} key={b.id} className="block p-2 bg-gray-700 hover:bg-gray-600 rounded">
                                <p>vs. {b.defender_char_id === character.id ? b.attacker_char_id : b.defender_char_id}</p>
                                <p className="text-sm text-gray-400">Status: {b.state}</p>
                            </Link>
                        )) : <p>No active battles.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
}
