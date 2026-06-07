import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useBattleResult } from '../lib/BattleResultContext';

export default function PlayersPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attackStatus, setAttackStatus] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { user } = useAuth();
    const { showBattle } = useBattleResult();

    // Generate invite link for sharing
    const inviteLink = typeof window !== 'undefined'
        ? `${window.location.origin}/register?ref=${user?.id || ''}`
        : '';

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
        setAttackStatus(null);
        try {
            // Use the real combat system; the result pops up in the global battle arena.
            const res = await apiClient.post<{ data: any }>('/storm8/attack', { defender_character_id: defenderId });
            showBattle(res.data);
        } catch (err: any) {
            setAttackStatus(err.message ?? 'Failed to launch attack.');
        }
    };

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = inviteLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareToFacebook = () => {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodeURIComponent('Join me in .shade and prepare to be attacked!')}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    const shareToTwitter = () => {
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me in .shade and prepare to be attacked!')}&url=${encodeURIComponent(inviteLink)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    if (loading) return <div className="neon-text">Loading players...</div>;
    if (error) return <div className="text-shade-red-600">Error: {error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-shade-red-400 via-fuchsia-400 to-shade-red-600 bg-clip-text text-transparent tracking-wide">Find Someone to Attack</h1>
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
                        <div key={player.id} className="p-4 rounded-xl flex justify-between items-center bg-gradient-to-r from-shade-black-800 to-shade-black-900 border border-shade-red-800/40 hover:border-shade-red-600/70 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-shade-red-700 to-fuchsia-700 flex items-center justify-center font-bold text-white shrink-0">
                                    {player.gamertag?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <Link to={`/shade/u/${encodeURIComponent(player.gamertag)}`} className="font-bold text-shade-red-100 truncate hover:underline block">{player.gamertag}</Link>
                                    <p className="text-xs text-shade-red-400 capitalize">Lv.{player.level} {player.class}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleAttack(player.id)}
                                className="bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg shadow-shade-red-900/40 hover:from-shade-red-600 hover:to-shade-red-400 transition-all">
                                ⚔ Attack
                            </button>
                        </div>
                    ))}
                </div>

                {/* Invite Friends */}
                <div className="p-4 beveled-panel space-y-4">
                    <div>
                        <p className="font-semibold neon-text">Invite Friends to Attack</p>
                        <p className="text-xs text-shade-black-400">Share your invite link to bring friends into .shade. Once they join, you can attack them!</p>
                    </div>

                    {/* Invite Link */}
                    <div className="space-y-2">
                        <label className="text-xs text-shade-black-400">Your Invite Link</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inviteLink}
                                readOnly
                                className="flex-1 bg-shade-black-800 text-shade-red-100 px-3 py-2 rounded neon-border focus:outline-none text-sm"
                            />
                            <button
                                onClick={copyInviteLink}
                                className="bg-shade-black-900 neon-border text-shade-red-100 px-4 py-2 rounded hover:neon-glow-strong"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Share Buttons */}
                    <div className="space-y-2">
                        <label className="text-xs text-shade-black-400">Share on Social</label>
                        <div className="flex gap-2">
                            <button
                                onClick={shareToFacebook}
                                className="flex-1 bg-[#1877F2] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity text-sm font-medium"
                            >
                                Share on Facebook
                            </button>
                            <button
                                onClick={shareToTwitter}
                                className="flex-1 bg-[#1DA1F2] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity text-sm font-medium"
                            >
                                Share on X
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-shade-black-500 border-t border-shade-black-700 pt-3">
                        <p>When friends join using your link, they will appear in the In-Game Players list above.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
