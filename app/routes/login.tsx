import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { FacebookAuthCard } from '../components/FacebookAuthCard';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSocialBusy, setIsSocialBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await apiClient.post<{ data: any }>('/auth/login', { email, password });
            login(response.data);
            navigate('/game/dashboard'); // Redirect to dashboard after successful login
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleFacebookAuth = async ({ accessToken, userID, needsUsername }: { accessToken: string; userID?: string; needsUsername?: boolean }) => {
        setError(null);
        setIsSocialBusy(true);
        try {
            const response = await apiClient.post<{ data: any }>(
                import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || '/auth/facebook',
                { accessToken, userID }
            );
            login(response.data);
            if (needsUsername || response.data?.needs_username_confirmation) {
                navigate('/profile/me');
            } else {
                navigate('/game/dashboard');
            }
        } catch (err: any) {
            setError(err.message ?? 'Facebook login failed');
        } finally {
            setIsSocialBusy(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
                <p className="text-xs uppercase tracking-[0.25rem] text-indigo-200/80">Account</p>
                <h1 className="text-3xl font-bold text-white mb-2">Login</h1>
                <p className="text-slate-200/80">Jump back into the MMORPG lobby. Use email/password or Facebook SSO.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow">
                    <div>
                        <label className="block text-sm text-slate-200">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-200">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded font-semibold"
                    >
                        Login
                    </button>
                </form>

                <FacebookAuthCard
                    onAuthenticated={handleFacebookAuth}
                    title="Connect with Facebook"
                    endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                />
            </div>

            {isSocialBusy && (
                <div className="text-sm text-slate-300">Finishing Facebook sign-in…</div>
            )}
        </div>
    );
}
