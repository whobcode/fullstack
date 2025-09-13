import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function PlayersPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await apiClient.get<{ data: any[] }>('/game/characters');
                // Filter out the current user from the list of opponents
                setPlayers(res.data.filter(p => p.id !== user?.characterId));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (user?.characterId) {
            fetchPlayers();
        }
    }, [user]);

    const handleChallenge = async (defenderId: string) => {
        try {
            const res = await apiClient.post<{ data: { battleId: string }}>('/game/battles', { defenderId, mode: 'async' });
            navigate(`/battles/${res.data.battleId}`);
        } catch (err: any) {
            alert(`Failed to create battle: ${err.message}`);
        }
    };

    if (loading) return <div>Loading players...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Find an Opponent</h1>
            <div className="space-y-2">
                {players.map(player => (
                    <div key={player.id} className="p-4 bg-gray-800 rounded flex justify-between items-center">
                        <div>
                            <p className="font-bold">{player.gamertag}</p>
                            <p className="text-sm text-gray-400">Lvl {player.level} {player.class}</p>
                        </div>
                        <button
                            onClick={() => handleChallenge(player.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                            Challenge
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
