import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { FacebookAuthCard } from '../components/FacebookAuthCard';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSocialBusy, setIsSocialBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await apiClient.post('/auth/register', { email, username, password });
            navigate('/login'); // Redirect to login after successful registration
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleFacebookAuth = async ({ accessToken, userID, needsUsername }: { accessToken: string; userID?: string; needsUsername?: boolean }) => {
        setError(null);
        setIsSocialBusy(true);
        try {
            // Reuse the same endpoint; backend can create-or-login based on token
            const res = await apiClient.post(
                import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || '/auth/facebook',
                { accessToken, userID, intent: 'register' }
            );
            if (needsUsername || (res as any)?.data?.needs_username_confirmation) {
                navigate('/profile/me');
            } else {
                navigate('/login');
            }
        } catch (err: any) {
            setError(err.message ?? 'Facebook signup failed');
        } finally {
            setIsSocialBusy(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div className="rounded-3xl beveled-panel p-6 shadow-xl neon-glow">
                <p className="text-xs uppercase tracking-[0.25rem] text-shade-red-600">Claim your shade</p>
                <h1 className="text-3xl font-bold neon-text mb-2">Register</h1>
                <p className="text-shade-red-200">Everyone has a shade. This is where yours begins.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl beveled-panel p-5 shadow">
                    <div>
                        <label className="block text-sm text-shade-red-200 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-shade-black-900 neon-border text-shade-red-100 focus:neon-glow outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-shade-red-200 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 rounded bg-shade-black-900 neon-border text-shade-red-100 focus:neon-glow outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-shade-red-200 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-shade-black-900 neon-border text-shade-red-100 focus:neon-glow outline-none transition-all"
                            required
                        />
                    </div>
                    {error && <p className="text-shade-red-600 neon-text text-sm">{error}</p>}
                    <button type="submit" className="w-full bg-shade-black-900 neon-border text-shade-red-600 p-2 rounded font-semibold hover:neon-glow-strong transition-all duration-200">
                        Claim Your Shade
                    </button>
                </form>

                <FacebookAuthCard
                    onAuthenticated={handleFacebookAuth}
                    title="Sign up with Facebook"
                    endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                />
            </div>

            {isSocialBusy && (
                <div className="text-sm text-shade-red-300 neon-pulse">Creating your shade via Facebook…</div>
            )}
        </div>
    );
}
