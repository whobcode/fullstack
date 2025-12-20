import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Invalid link - no token provided');
      return;
    }

    const verify = async () => {
      try {
        const response = await apiClient.post<{ data: any }>('/auth/magic-link/verify', { token });
        login(response.data);
        setStatus('success');

        // Redirect after a short delay
        setTimeout(() => {
          if (response.data?.needs_username_confirmation) {
            navigate('/profile/me');
          } else {
            navigate('/feed');
          }
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err?.message ?? 'Failed to verify magic link');
      }
    };

    verify();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-social-cream-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-6xl font-bold text-social-green-600">me</Link>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-social-cream-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-social-green-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-social-forest-700">Signing you in...</h2>
              <p className="text-social-forest-500 mt-2">Just a moment while we verify your link.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-social-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-social-forest-700">You're signed in!</h2>
              <p className="text-social-forest-500 mt-2">Redirecting you now...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-social-forest-700">Oops!</h2>
              <p className="text-red-600 mt-2">{error}</p>
              <Link
                to="/login"
                className="inline-block mt-6 bg-social-green-600 hover:bg-social-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
