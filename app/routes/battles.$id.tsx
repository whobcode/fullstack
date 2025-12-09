import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

/**
 * A page that displays the details of a single battle, including the turn history.
 * It also allows the current user to take their turn if it's their turn.
 * @returns {JSX.Element} The BattlePage component.
 */
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (loading) return <div className="neon-text">Loading battle...</div>;
    if (error) return <div className="text-shade-red-600">Error: {error}</div>;
    if (!battle) return <div className="text-shade-red-100">Battle not found.</div>;

    const myCharacterId = user?.characterId;
    const isMyTurn = battle.state === 'active' && battle.attacker_char_id === myCharacterId;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 neon-text">Battle: {battle.attacker_char_id} vs {battle.defender_char_id}</h1>
            <p className="text-shade-red-100">Status: <span className="font-semibold neon-text">{battle.state}</span></p>

            {isMyTurn && (
                 <button onClick={handleTakeTurn} className="my-4 bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all px-4 py-2 rounded">
                    Attack!
                </button>
            )}
            {battle.state === 'completed' && (
                <p className="my-4 text-lg font-bold text-shade-red-400">Winner: {battle.winner_char_id}</p>
            )}

            <div className="mt-4">
                <h2 className="text-xl font-semibold neon-text">Turn History</h2>
                <div className="space-y-2 mt-2">
                    {battle.turns.map((turn: any) => (
                        <div key={turn.id} className="p-2 beveled-panel">
                           <p className="text-shade-red-100">Turn {turn.turn_index}: {turn.actor_char_id} attacks, dealing {turn.damage} damage.</p>
                           <p className="text-xs text-shade-black-400">Target HP after: {turn.hp_after_target}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
