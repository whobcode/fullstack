import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function FacebookDeauthorizePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const confirmationCode = searchParams.get('code');

    useEffect(() => {
        if (confirmationCode) {
            // Simulate processing
            setTimeout(() => {
                setStatus('success');
            }, 1500);
        } else {
            setStatus('error');
        }
    }, [confirmationCode]);

    return (
        <div className="max-w-2xl mx-auto space-y-5 py-12">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl text-center">
                {status === 'processing' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <h1 className="text-2xl font-bold text-white mb-2">Processing Your Request</h1>
                        <p className="text-slate-300">We're removing your Facebook connection...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Facebook Connection Removed</h1>
                        <p className="text-slate-300 mb-4">
                            Your Facebook account has been successfully disconnected from our platform.
                        </p>
                        {confirmationCode && (
                            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                                <p className="text-xs text-slate-400 mb-1">Confirmation Code</p>
                                <code className="text-sm text-indigo-300 font-mono">{confirmationCode}</code>
                            </div>
                        )}
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-white">What happens next?</h2>
                            <ul className="text-sm text-slate-300 space-y-1 text-left max-w-md mx-auto">
                                <li>✓ Your Facebook login has been disconnected</li>
                                <li>✓ All active sessions have been terminated</li>
                                <li>✓ Your game account remains active with email login</li>
                                <li>• You can reconnect Facebook anytime from your profile</li>
                            </ul>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                            >
                                Login Again
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                            >
                                Go Home
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Invalid Request</h1>
                        <p className="text-slate-300 mb-6">
                            No confirmation code was provided. This page is only accessible through Facebook's deauthorization process.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                            Go Home
                        </button>
                    </>
                )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
                <h3 className="text-sm font-semibold text-white mb-2">Need help?</h3>
                <p className="text-xs text-slate-400">
                    If you have any questions about data deletion or your account, please contact support.
                </p>
            </div>
        </div>
    );
}
