import { useState } from "react";
import { apiClient } from "../lib/api";

type MagicLinkAuthCardProps = {
  title?: string;
  description?: string;
};

export function MagicLinkAuthCard({
  title = "Sign in with Email",
  description = "We'll send you a magic link to sign in instantly",
}: MagicLinkAuthCardProps) {
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isBusy) return;

    setIsBusy(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.post("/auth/magic-link/request", { email });
      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      setError(err?.message ?? "Failed to send magic link");
    } finally {
      setIsBusy(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3 rounded-2xl social-panel p-4 shadow">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-social-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-social-forest-700">Check your email!</h3>
          <p className="text-sm text-social-forest-500 mt-1">
            We sent you a magic link. Click it to sign in.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 text-sm text-social-green-600 hover:underline"
          >
            Send another link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl social-panel p-4 shadow">
      <div>
        <p className="text-xs uppercase tracking-wide text-social-gold-600">Passwordless</p>
        <h3 className="text-lg font-semibold text-social-forest-700">{title}</h3>
        <p className="text-xs text-social-forest-400">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-2 border border-social-cream-400 rounded-full text-sm focus:outline-none focus:border-social-green-500"
          required
        />
        <button
          type="submit"
          disabled={isBusy || !email}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-social-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-social-green-700 disabled:opacity-60 transition-all"
        >
          {isBusy ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Magic Link
            </>
          )}
        </button>
      </form>

      {error && <p className="text-xs text-social-orange-700">{error}</p>}

      <p className="text-[11px] text-social-forest-400">No password needed. We'll email you a secure link.</p>
    </div>
  );
}
