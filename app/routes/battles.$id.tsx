import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function BattlePage() {
    const { id: battleId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [battle, setBattle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBattle = async () => {
        if (!battleId) return;
        setLoading(true);
        try {
            const res = await apiClient.get<{ data: any }>(`/game/battles/${battleId}`);
            setBattle(res.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBattle();
    }, [battleId]);

    const handleTakeTurn = async () => {
        if (!battleId) return;
        try {
            await apiClient.post(`/game/battles/${battleId}/turn`, { action: 'attack' });
            // Refetch battle data to show the result
            fetchBattle();
        } catch (err: any) {
            alert(`Failed to take turn: ${err.message}`);
        }
    };

    if (loading) return <div>Loading battle...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;
    if (!battle) return <div>Battle not found.</div>;

    const myCharacterId = user?.characterId;
    const isMyTurn = battle.state === 'active' && battle.attacker_char_id === myCharacterId;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Battle: {battle.attacker_char_id} vs {battle.defender_char_id}</h1>
            <p>Status: <span className="font-semibold">{battle.state}</span></p>

            {isMyTurn && (
                 <button onClick={handleTakeTurn} className="my-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                    Attack!
                </button>
            )}
            {battle.state === 'completed' && (
                <p className="my-4 text-lg font-bold text-yellow-400">Winner: {battle.winner_char_id}</p>
            )}

            <div className="mt-4">
                <h2 className="text-xl font-semibold">Turn History</h2>
                <div className="space-y-2 mt-2">
                    {battle.turns.map((turn: any) => (
                        <div key={turn.id} className="p-2 bg-gray-800 rounded">
                           <p>Turn {turn.turn_index}: {turn.actor_char_id} attacks, dealing {turn.damage} damage.</p>
                           <p className="text-xs text-gray-400">Target HP after: {turn.hp_after_target}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
