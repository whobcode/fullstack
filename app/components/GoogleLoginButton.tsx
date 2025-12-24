import { useEffect, useRef, useCallback } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type GoogleLoginButtonProps = {
  onSuccess?: (data: { needsUsername?: boolean }) => void;
  onError?: (error: string) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const res = await apiClient.post<{ data: any }>("/auth/google", {
          credential: response.credential,
        });
        login(res.data as any);
        onSuccess?.({
          needsUsername: res.data?.needs_username_confirmation,
        });
      } catch (err: any) {
        console.error("Google auth failed:", err);
        onError?.(err?.message ?? "Google login failed");
      }
    },
    [login, onSuccess, onError]
  );

  useEffect(() => {
    if (!clientId || typeof window === "undefined") return;

    const initializeGoogle = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "left",
          width: 280,
        });
      }
    };

    // Load the Google Identity Services script if not already loaded
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else if (window.google) {
      initializeGoogle();
    }
  }, [clientId, handleCredentialResponse]);

  if (!clientId) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Google login not configured
      </div>
    );
  }

  return <div ref={buttonRef} className="google-login-wrapper flex justify-center" />;
}
