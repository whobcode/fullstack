import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type FacebookAuthCardProps = {
  onAuthenticated?: (payload: { accessToken: string; userID?: string; needsUsername?: boolean }) => Promise<void> | void;
  title?: string;
  endpointHint?: string;
};

declare global {
  interface Window {
    FB?: any;
  }
}

export function FacebookAuthCard({
  onAuthenticated,
  title = "Sign in with Facebook",
  endpointHint = "POST /auth/facebook",
}: FacebookAuthCardProps) {
  const [isClient, setIsClient] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
  const { login } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load the Facebook SDK lazily on the client
  useEffect(() => {
    if (!isClient || !appId) return;
    if (typeof window === "undefined") return;
    if ((window as any).FB) return;
    const scriptId = "facebook-jssdk";
    if (document.getElementById(scriptId)) return;
    const js = document.createElement("script");
    js.id = scriptId;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.async = true;
    js.defer = true;
    js.onload = () => {
      (window as any).FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      });
    };
    js.onerror = () => {
      setError("Failed to load Facebook SDK");
    };
    document.body.appendChild(js);
  }, [isClient, appId]);

  const handleClick = async () => {
    if (!isClient || !appId) return;
    const FB = (window as any).FB as any;
    if (!FB) return;
    setIsBusy(true);
    setError(null);
    FB.login(
      (response: any) => {
        if (response?.authResponse?.accessToken) {
          (async () => {
            try {
              const res = await apiClient.post<{ data: any }>("/auth/facebook", {
                accessToken: response.authResponse.accessToken,
              });
              login(res.data as any);
              await onAuthenticated?.({
                accessToken: response.authResponse.accessToken,
                userID: response.authResponse.userID,
                needsUsername: res.data?.needs_username_confirmation,
              });
            } catch (err) {
              console.error("Facebook login failed", err);
              setError((err as Error)?.message ?? "Facebook login failed");
            } finally {
              setIsBusy(false);
            }
          })();
        } else {
          setIsBusy(false);
        }
      },
      { scope: "public_profile,email,user_photos,user_friends" }
    );
  };

  if (!appId) {
    return (
      <div className="rounded-2xl border border-social-cream-400 bg-social-cream-200 px-4 py-3 text-sm text-social-forest-500">
        Add `VITE_FACEBOOK_APP_ID` to enable Facebook SSO ({endpointHint}).
      </div>
    );
  }

  if (!isClient) {
    return <div className="h-24 w-full rounded-2xl bg-social-cream-200 border border-social-cream-400 animate-pulse" aria-hidden />;
  }

  return (
    <div className="space-y-3 rounded-2xl social-panel p-4 shadow">
      <div>
        <p className="text-xs uppercase tracking-wide text-social-gold-600">Social login</p>
        <h3 className="text-lg font-semibold text-social-forest-700">{title}</h3>
        <p className="text-xs text-social-forest-400">Quick and easy sign in with your Facebook account</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleClick}
          disabled={!isClient || isBusy}
          className="inline-flex items-center gap-2 rounded-full bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0f6ae0] disabled:opacity-60 transition-all"
        >
          {isBusy ? "Connecting..." : "Continue with Facebook"}
        </button>
      </div>

      {error && <p className="text-xs text-social-orange-700">{error}</p>}

      <p className="text-[11px] text-social-forest-400">By continuing, you agree to our terms of service.</p>
    </div>
  );
}
