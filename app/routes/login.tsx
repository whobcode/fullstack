import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { OAuthButtons } from '../components/OAuthButtons';
import { MagicLinkAuthCard } from '../components/MagicLinkAuthCard';

// Friendly text for ?error=... codes returned by the OAuth redirect flow.
const OAUTH_ERRORS: Record<string, string> = {
    oauth_denied: 'Sign-in was cancelled.',
    oauth_state: 'Sign-in session expired. Please try again.',
    oauth_failed: 'Could not sign you in with that provider. Please try again.',
    provider_unavailable: 'That sign-in provider is not available right now.',
};

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('error');
        if (code) setError(OAUTH_ERRORS[code] || 'Sign-in failed. Please try again.');
    }, [searchParams]);

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

    return (
        <div className="min-h-screen social-dark-bg flex items-center justify-center py-12 px-4">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg bg-white text-social-forest-700 placeholder-gray-400"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg bg-white text-social-forest-700 placeholder-gray-400"
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
                        <Link to="/forgot-password" className="text-social-green-600 hover:underline text-sm">
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

                    <MagicLinkAuthCard
                        title="Sign in with Email"
                        description="No password needed - we'll email you a link"
                    />

                    <div className="flex justify-center">
                        <GoogleLoginButton
                            onSuccess={({ needsUsername }) => {
                                if (needsUsername) {
                                    navigate('/profile/me');
                                } else {
                                    navigate('/feed');
                                }
                            }}
                            onError={(err) => setError(err)}
                        />
                    </div>

                    <OAuthButtons />

                    <div className="border-t border-gray-300 pt-4 mt-4">
                        <Link
                            to="/register"
                            className="block w-full bg-social-gold-500 hover:bg-social-gold-600 text-white text-lg font-bold py-3 rounded-lg text-center transition-colors"
                        >
                            Create New Account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
