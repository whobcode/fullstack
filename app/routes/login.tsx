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
        <div className="min-h-screen bg-social-cream-100 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="text-6xl font-bold text-social-green-600">me</Link>
                    <p className="text-social-forest-500 mt-2">Log in to see updates from friends</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            autoComplete="email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
                            required
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-social-green-600 hover:bg-social-green-700 text-white text-xl font-bold py-3 rounded-lg transition-colors"
                        >
                            Log In
                        </button>
                    </form>

                    <div className="text-center">
                        <Link to="/login" className="text-social-green-600 hover:underline text-sm">
                            Forgotten password?
                        </Link>
                    </div>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">or</span>
                        </div>
                    </div>

                    <FacebookAuthCard
                        onAuthenticated={handleFacebookAuth}
                        title="Continue with Facebook"
                        endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                    />

                    <div className="border-t border-gray-300 pt-4 mt-4">
                        <Link
                            to="/register"
                            className="block w-full bg-social-gold-500 hover:bg-social-gold-600 text-white text-lg font-bold py-3 rounded-lg text-center transition-colors"
                        >
                            Create New Account
                        </Link>
                    </div>
                </div>

                {isSocialBusy && (
                    <div className="text-center mt-4 text-social-forest-500">Signing in with Facebook...</div>
                )}
            </div>
        </div>
    );
}
