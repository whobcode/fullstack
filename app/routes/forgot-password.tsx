import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await apiClient.post('/auth/password-reset/request', { email });
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-social-cream-100 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="text-6xl font-bold text-social-green-600">me</Link>
                    <p className="text-social-forest-500 mt-2">Reset your password</p>
                </div>

                {/* Reset Card */}
                <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-social-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-social-forest-700">Check your email</h3>
                            <p className="text-sm text-social-forest-500 mt-1">
                                If an account exists with that email, you'll receive a password reset link.
                            </p>
                            <Link
                                to="/login"
                                className="mt-4 inline-block text-social-green-600 hover:underline"
                            >
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-social-forest-700 text-center">Forgot your password?</h2>
                            <p className="text-sm text-social-forest-500 text-center">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

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
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-social-green-600 hover:bg-social-green-700 text-white text-xl font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>

                            <div className="text-center pt-4 border-t border-gray-300 mt-4">
                                <Link to="/login" className="text-social-green-600 hover:underline font-medium">
                                    Back to login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
