import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            await apiClient.post('/auth/password-reset/reset', { token, password });
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-social-cream-100 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link to="/" className="text-6xl font-bold text-social-green-600">me</Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-xl p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-social-forest-700">Invalid Reset Link</h3>
                        <p className="text-sm text-social-forest-500 mt-1">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="mt-4 inline-block text-social-green-600 hover:underline"
                        >
                            Request a new reset link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-social-cream-100 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="text-6xl font-bold text-social-green-600">me</Link>
                    <p className="text-social-forest-500 mt-2">Set a new password</p>
                </div>

                {/* Reset Card */}
                <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-social-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-social-forest-700">Password Reset!</h3>
                            <p className="text-sm text-social-forest-500 mt-1">
                                Your password has been reset successfully. Redirecting to login...
                            </p>
                            <Link
                                to="/login"
                                className="mt-4 inline-block text-social-green-600 hover:underline"
                            >
                                Go to login now
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-social-forest-700 text-center">Reset your password</h2>
                            <p className="text-sm text-social-forest-500 text-center">
                                Enter your new password below.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="New password"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg bg-white text-gray-900 placeholder-gray-400"
                                    required
                                    minLength={8}
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg bg-white text-gray-900 placeholder-gray-400"
                                    required
                                    minLength={8}
                                />
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-social-green-600 hover:bg-social-green-700 text-white text-xl font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
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
