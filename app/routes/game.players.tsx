import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

type NetworkUser = {
    id: string;
    name: string;
    pictureUrl?: string;
    profileUrl?: string;
};

export default function PlayersPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fbQuery, setFbQuery] = useState('');
    const [fbResults, setFbResults] = useState<NetworkUser[]>([]);
    const [fbLoading, setFbLoading] = useState(false);
    const [fbError, setFbError] = useState<string | null>(null);
    const [attackStatus, setAttackStatus] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await apiClient.get<{ data: any[] }>('/game/characters');
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
    }, [user?.characterId]);

    const handleAttack = async (defenderId: string) => {
        try {
            const res = await apiClient.post<{ data: { battleId: string }}>('/game/battles', { defenderId, mode: 'async' });
            navigate(`/shade/battles/${res.data.battleId}`);
        } catch (err: any) {
            setAttackStatus(err.message ?? 'Failed to launch attack.');
        }
    };

    const handleFacebookSearch = async () => {
        if (!fbQuery.trim()) {
            setFbError('Enter a name to search.');
            return;
        }
        setFbLoading(true);
        setFbError(null);
        setAttackStatus(null);
        try {
            const res = await apiClient.get<{ data: NetworkUser[] }>(`/game/network/search?network=facebook&q=${encodeURIComponent(fbQuery)}`);
            setFbResults(res.data);
            if (!res.data.length) {
                setFbError('No Facebook users found.');
            }
        } catch (err: any) {
            setFbError(err.message ?? 'Facebook search failed.');
        } finally {
            setFbLoading(false);
        }
    };

    const handleFacebookAttack = async (target: NetworkUser) => {
        setAttackStatus(null);
        setFbError(null);
        try {
            const res = await apiClient.post<{ data: any }>('/game/network/attack', {
                network: 'facebook',
                targetId: target.id,
                targetName: target.name,
                targetProfileUrl: target.profileUrl,
            });
            const payload = res.data;

            if (payload?.type === 'registered' && payload.battleId) {
                navigate(`/shade/battles/${payload.battleId}`);
                return;
            }

            if (payload?.type === 'invite') {
                let statusCopy = 'Attack processed.';
                if (payload.messageStatus === 'sent') {
                    statusCopy = 'Attack landed. Invite sent via Messenger.';
                } else if (payload.messageStatus === 'failed') {
                    statusCopy = 'Attack landed, but the Messenger invite was blocked.';
                }
                setAttackStatus(`${statusCopy} Join link: ${payload.joinLink}`);
            }
        } catch (err: any) {
            setFbError(err.message ?? 'Failed to attack via Facebook.');
        }
    };

    if (loading) return <div className="neon-text">Loading players...</div>;
    if (error) return <div className="text-shade-red-600">Error: {error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 neon-text">Find Someone to Attack</h1>
            {attackStatus && (
                <div className="mb-4 rounded border border-shade-red-600 bg-shade-black-700 px-3 py-2 text-sm text-shade-red-100">
                    {attackStatus}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* In-game players */}
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold neon-text mb-2">In-Game Players</h2>
                    {players.length === 0 && (
                        <div className="p-4 beveled-panel text-shade-red-100">No in-game players available to attack right now.</div>
                    )}
                    {players.map(player => (
                        <div key={player.id} className="p-4 beveled-panel flex justify-between items-center">
                            <div>
                                <p className="font-bold neon-text">{player.gamertag}</p>
                                <p className="text-sm text-shade-black-400">Lvl {player.level} {player.class}</p>
                            </div>
                            <button
                                onClick={() => handleAttack(player.id)}
                                className="bg-shade-black-900 neon-border text-shade-red-600 hover:neon-glow-strong transition-all px-4 py-2 rounded">
                                Attack
                            </button>
                        </div>
                    ))}
                </div>

                {/* Facebook search */}
                <div className="p-4 beveled-panel space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold neon-text">Find on Facebook</p>
                            <p className="text-xs text-shade-black-400">Attack anyone on Facebook; we auto-send a Messenger invite if they are not here yet.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={fbQuery}
                            onChange={(e) => setFbQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFacebookSearch()}
                            placeholder="Search Facebook users to attack"
                            className="flex-1 bg-shade-black-800 text-shade-red-100 px-3 py-2 rounded neon-border focus:outline-none"
                        />
                        <button
                            onClick={handleFacebookSearch}
                            disabled={fbLoading}
                            className="bg-shade-black-900 neon-border text-shade-red-100 px-4 py-2 rounded hover:neon-glow-strong disabled:opacity-60"
                        >
                            {fbLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {fbError && <p className="text-sm text-shade-red-500">{fbError}</p>}
                    <div className="space-y-2">
                        {fbResults.map((person) => (
                            <div key={person.id} className="p-3 rounded bg-shade-black-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {person.pictureUrl ? (
                                        <img src={person.pictureUrl} alt={person.name} className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-shade-black-700 flex items-center justify-center text-sm text-shade-red-100">
                                            {person.name?.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-shade-red-100 font-semibold">{person.name}</p>
                                        {person.profileUrl && (
                                            <a href={person.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-shade-red-500 hover:text-shade-red-300">
                                                View profile
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFacebookAttack(person)}
                                    className="bg-shade-black-900 neon-border text-shade-red-100 px-3 py-2 rounded hover:neon-glow-strong"
                                >
                                    Attack
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
