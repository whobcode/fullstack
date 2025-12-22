import { useEffect, useRef, useCallback } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type FacebookLoginButtonProps = {
  onSuccess?: (data: { needsUsername?: boolean }) => void;
  onError?: (error: string) => void;
  size?: "small" | "medium" | "large";
  buttonType?: "continue_with" | "login_with";
  layout?: "default" | "rounded";
};

declare global {
  interface Window {
    FB?: {
      init: (config: any) => void;
      XFBML: { parse: (element?: HTMLElement) => void };
      getLoginStatus: (callback: (response: any) => void) => void;
      logout: (callback?: () => void) => void;
    };
    fbAsyncInit?: () => void;
    handleFacebookLogin?: () => void;
  }
}

export function FacebookLoginButton({
  onSuccess,
  onError,
  size = "large",
  buttonType = "continue_with",
  layout = "rounded",
}: FacebookLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;

  // Handle the login response
  const handleLoginStatus = useCallback(async (response: any) => {
    if (response.status === "connected" && response.authResponse?.accessToken) {
      try {
        const res = await apiClient.post<{ data: any }>("/auth/facebook", {
          accessToken: response.authResponse.accessToken,
        });
        login(res.data as any);
        onSuccess?.({
          needsUsername: res.data?.needs_username_confirmation,
        });
      } catch (err: any) {
        console.error("Facebook auth failed:", err);
        onError?.(err?.message ?? "Facebook login failed");
      }
    }
  }, [login, onSuccess, onError]);

  useEffect(() => {
    if (!appId || typeof window === "undefined") return;

    // Expose global callback for the button's onlogin
    window.handleFacebookLogin = () => {
      window.FB?.getLoginStatus((response) => {
        handleLoginStatus(response);
      });
    };

    // Initialize FB SDK
    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });

      // Parse XFBML in our container
      if (containerRef.current) {
        window.FB?.XFBML.parse(containerRef.current);
      }
    };

    // Load the SDK if not already loaded
    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    } else if (window.FB) {
      // SDK already loaded, just parse
      if (containerRef.current) {
        window.FB.XFBML.parse(containerRef.current);
      }
    }

    return () => {
      // Cleanup global callback
      delete window.handleFacebookLogin;
    };
  }, [appId, handleLoginStatus]);

  // Re-parse XFBML when container changes
  useEffect(() => {
    if (window.FB && containerRef.current) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [size, buttonType, layout]);

  if (!appId) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Facebook login not configured
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fb-login-wrapper">
      <div
        className="fb-login-button"
        data-width=""
        data-size={size}
        data-button-type={buttonType}
        data-layout={layout}
        data-auto-logout-link="false"
        data-use-continue-as="true"
        data-scope="public_profile,email"
        data-onlogin="handleFacebookLogin()"
      />
    </div>
  );
}
