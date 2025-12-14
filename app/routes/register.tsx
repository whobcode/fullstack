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
                navigate('/feed');
            }
        } catch (err: any) {
            setError(err.message ?? 'Facebook signup failed');
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
                    <p className="text-social-forest-500 mt-2">It's quick and easy.</p>
                </div>

                {/* Register Card */}
                <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
                    <h2 className="text-2xl font-bold text-social-forest-700 text-center">Create a new account</h2>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
                            required
                        />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
                            required
                        />
                        <p className="text-xs text-gray-500">
                            By clicking Sign Up, you agree to our Terms, Privacy Policy and Cookies Policy.
                        </p>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-social-gold-500 hover:bg-social-gold-600 text-white text-xl font-bold py-3 rounded-lg transition-colors"
                        >
                            Sign Up
                        </button>
                    </form>

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
                        title="Sign up with Facebook"
                        endpointHint={import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT || "/auth/facebook"}
                    />

                    <div className="text-center pt-4 border-t border-gray-300 mt-4">
                        <Link to="/login" className="text-social-green-600 hover:underline font-medium">
                            Already have an account?
                        </Link>
                    </div>
                </div>

                {isSocialBusy && (
                    <div className="text-center mt-4 text-social-forest-500">Creating account with Facebook...</div>
                )}
            </div>
        </div>
    );
}
