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
    const [attackAgainLoading, setAttackAgainLoading] = useState(false);
    const [attackAgainError, setAttackAgainError] = useState<string | null>(null);

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
    const opponentId = myCharacterId === battle.attacker_char_id ? battle.defender_char_id : battle.attacker_char_id;

    const handleAttackAgain = async () => {
        if (!opponentId) return;
        setAttackAgainLoading(true);
        setAttackAgainError(null);
        try {
            const res = await apiClient.post<{ data: { battleId: string }}>('/game/battles', { defenderId: opponentId, mode: battle.mode || 'async' });
            navigate(`/shade/battles/${res.data.battleId}`);
        } catch (err: any) {
            setAttackAgainError(err.message);
        } finally {
            setAttackAgainLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/60 shadow-[0_0_25px_rgba(255,42,42,0.12)]">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-shade-red-400 via-fuchsia-400 to-shade-red-600 bg-clip-text text-transparent">{battle.attacker_gamertag ?? 'Unknown'} <span className="text-shade-red-500">vs</span> {battle.defender_gamertag ?? 'Unknown'}</h1>
                <p className="text-shade-red-300 mt-1">Status: <span className="font-semibold text-shade-red-100 capitalize">{battle.state}</span></p>

                {isMyTurn && (
                     <button onClick={handleTakeTurn} className="mt-4 bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white font-bold px-5 py-2 rounded-lg hover:from-shade-red-600 hover:to-shade-red-400 transition-all shadow-lg shadow-shade-red-900/40">
                        ⚔ Attack!
                    </button>
                )}
                {battle.state === 'completed' && (
                    <div className="mt-4 space-y-3">
                        <p className="text-lg font-bold text-emerald-300">🏆 Winner: {battle.winner_gamertag ?? 'Unknown'}</p>
                        {opponentId && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAttackAgain}
                                    disabled={attackAgainLoading}
                                    className="bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white font-bold px-5 py-2 rounded-lg hover:from-shade-red-600 hover:to-shade-red-400 transition-all shadow-lg shadow-shade-red-900/40 disabled:opacity-60"
                                >
                                    {attackAgainLoading ? 'Launching...' : '⚔ Attack Again'}
                                </button>
                                {attackAgainError && <span className="text-sm text-shade-red-500">{attackAgainError}</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6">
                <h2 className="text-xl font-bold neon-text mb-3">Turn History</h2>
                <div className="space-y-2">
                    {battle.turns.map((turn: any) => (
                        <div key={turn.id} className="p-3 rounded-lg bg-shade-black-900/70 border border-shade-red-800/40">
                           <p className="text-shade-red-100">Turn {turn.turn_index}: <span className="font-bold text-rose-300">{turn.actor_char_id === battle.defender_char_id ? (battle.defender_gamertag ?? 'Defender') : (battle.attacker_gamertag ?? 'Attacker')}</span> attacks for <span className="font-bold text-shade-red-400">{turn.damage}</span> damage.</p>
                           <p className="text-xs text-shade-red-500 mt-1">Target HP after: {turn.hp_after_target}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
