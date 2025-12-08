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
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
                <p className="text-xs uppercase tracking-[0.25rem] text-emerald-200/80">Create account</p>
                <h1 className="text-3xl font-bold text-white mb-2">Register</h1>
                <p className="text-slate-200/80">Forge your profile for the social MMO. Email signup or Facebook fast-lane.</p>
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
                        <label className="block text-sm text-slate-200">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                    <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white p-2 rounded font-semibold">
                        Register
                    </button>
                </form>

                <FacebookAuthCard
                    onAuthenticated={handleFacebookAuth}
                    title="Sign up with Facebook"
                    endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                />
            </div>

            {isSocialBusy && (
                <div className="text-sm text-slate-300">Creating your account via Facebook…</div>
            )}
        </div>
    );
}
