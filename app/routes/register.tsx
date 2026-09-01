import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
            navigate('/login');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleFacebookAuth = async ({ accessToken, userID, needsUsername }: { accessToken: string; userID?: string; needsUsername?: boolean }) => {
        setError(null);
        setIsSocialBusy(true);
        try {
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
        <div className="social-dark-bg py-12">
            <div className="max-w-3xl mx-auto space-y-5 px-4">
                <div className="rounded-3xl social-dark-card p-6 shadow-xl">
                    <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Join us</p>
                    <h1 className="text-3xl font-bold text-social-blue-300 mb-2">Create Account</h1>
                    <p className="text-social-blue-400">Start connecting with friends and sharing your story.</p>
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
                            <label className="block text-sm text-social-blue-400 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
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
                        <button type="submit" className="w-full social-button p-3 rounded-lg font-semibold">
                            Create Account
                        </button>
                        <p className="text-center text-sm text-social-blue-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-social-blue-300 hover:text-social-blue-200 font-medium">
                                Sign In
                            </Link>
                        </p>
                    </form>

                    <FacebookAuthCard
                        onAuthenticated={handleFacebookAuth}
                        title="Sign up with Facebook"
                        endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                    />
                </div>

                {isSocialBusy && (
                    <div className="text-sm text-social-blue-400">Creating account via Facebook...</div>
                )}
            </div>
        </div>
    );
}
