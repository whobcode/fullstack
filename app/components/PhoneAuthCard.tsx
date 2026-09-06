import { useState } from "react";
import { apiClient } from "../lib/api";

type PhoneAuthCardProps = {
  title?: string;
  description?: string;
  /** Called once the code is verified and a session exists. */
  onAuthenticated?: (data: { needs_username_confirmation?: boolean }) => void;
};

export function PhoneAuthCard({
  title = "Sign in with Phone",
  description = "We'll text you a 6-digit code",
  onAuthenticated,
}: PhoneAuthCardProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || isBusy) return;

    setIsBusy(true);
    setError(null);

    try {
      const res = await apiClient.post<{ message: string }>("/auth/phone/request", { phone });
      setSentTo(res?.message ?? null);
      setStep("code");
    } catch (err: any) {
      setError(err?.message ?? "Could not send the code");
    } finally {
      setIsBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || isBusy) return;

    setIsBusy(true);
    setError(null);

    try {
      const res = await apiClient.post<{ data: { needs_username_confirmation?: boolean } }>(
        "/auth/phone/verify",
        { phone, code }
      );
      onAuthenticated?.(res.data);
    } catch (err: any) {
      setError(err?.message ?? "That code didn't work");
    } finally {
      setIsBusy(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2 border border-social-cream-400 rounded-full text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400";

  if (step === "code") {
    return (
      <div className="space-y-3 rounded-2xl social-panel p-4 shadow">
        <div>
          <p className="text-xs uppercase tracking-wide text-social-gold-600">Verify</p>
          <h3 className="text-lg font-semibold text-social-forest-700">Enter your code</h3>
          <p className="text-xs text-social-forest-400">{sentTo ?? "We sent you a 6-digit code."}</p>
        </div>

        <form onSubmit={verifyCode} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputClass} tracking-[0.4em] text-center`}
            required
          />
          <button
            type="submit"
            disabled={isBusy || code.length !== 6}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-social-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-social-green-700 disabled:opacity-60 transition-all"
          >
            {isBusy ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        {error && <p className="text-xs text-social-orange-700">{error}</p>}

        <button
          onClick={() => {
            setStep("phone");
            setCode("");
            setError(null);
          }}
          className="text-sm text-social-green-600 hover:underline"
        >
          Use a different number
        </button>
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

      <form onSubmit={requestCode} className="space-y-3">
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          className={inputClass}
          required
        />
        <button
          type="submit"
          disabled={isBusy || !phone}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-social-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-social-green-700 disabled:opacity-60 transition-all"
        >
          {isBusy ? "Sending..." : "Text Me a Code"}
        </button>
      </form>

      {error && <p className="text-xs text-social-orange-700">{error}</p>}

      <p className="text-[11px] text-social-forest-400">
        Standard message rates may apply. Your number is only used to sign you in and,
        if you allow it, to help friends find you.
      </p>
    </div>
  );
}
