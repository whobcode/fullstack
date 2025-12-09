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
        <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-12">
            <div className="max-w-3xl mx-auto space-y-5 px-4">
                <div className="rounded-3xl social-panel p-6 shadow-xl">
                    <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Welcome back</p>
                    <h1 className="text-3xl font-bold text-social-navy-700 mb-2">Sign In</h1>
                    <p className="text-social-navy-500">Access your account with email/password or Facebook.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl social-panel p-5 shadow">
                        <div>
                            <label className="block text-sm text-social-navy-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 rounded-lg social-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-social-navy-600 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-lg social-input"
                                required
                            />
                        </div>
                        {error && <p className="text-social-orange-700 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full social-button p-3 rounded-lg font-semibold"
                        >
                            Sign In
                        </button>
                        <p className="text-center text-sm text-social-navy-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-social-orange-600 hover:text-social-orange-700 font-medium">
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
                    <div className="text-sm text-social-navy-500">Finishing Facebook sign-in...</div>
                )}
            </div>
        </div>
    );
}
