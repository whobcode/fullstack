import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
            navigate('/feed');
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
                navigate('/feed');
            }
        } catch (err: any) {
            setError(err.message ?? 'Facebook login failed');
        } finally {
            setIsSocialBusy(false);
        }
    };

    return (
        <div className="social-dark-bg py-12">
            <div className="max-w-3xl mx-auto space-y-5 px-4">
                <div className="rounded-3xl social-dark-card p-6 shadow-xl">
                    <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Welcome back</p>
                    <h1 className="text-3xl font-bold text-social-blue-300 mb-2">Sign In</h1>
                    <p className="text-social-blue-400">Access your account with email/password or Facebook.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl social-dark-card p-5 shadow">
                        <div>
                            <label className="block text-sm text-social-blue-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-social-blue-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none"
                                required
                            />
                        </div>
                        {error && <p className="text-social-orange-400 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full social-button p-3 rounded-lg font-semibold"
                        >
                            Sign In
                        </button>
                        <p className="text-center text-sm text-social-blue-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-social-blue-300 hover:text-social-blue-200 font-medium">
                                Register
                            </Link>
                        </p>
                    </form>

                    <FacebookAuthCard
                        onAuthenticated={handleFacebookAuth}
                        title="Connect with Facebook"
                        endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                    />
                </div>

                {isSocialBusy && (
                    <div className="text-sm text-social-blue-400">Finishing Facebook sign-in...</div>
                )}
            </div>
        </div>
    );
}
