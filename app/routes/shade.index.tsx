import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { apiClient } from "../lib/api";

export default function ShadeIndexPage() {
  const { isAuthenticated, user } = useAuth();
  const [shadeAvatar, setShadeAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShadeAvatar = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await apiClient.post<{ image: string; success: boolean }>("/ai/shade-avatar", {});
      if (result.image) {
        setShadeAvatar(result.image);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate shade avatar");
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine what to show in the avatar circle
  const getAvatarContent = () => {
    if (shadeAvatar) {
      return (
        <img
          src={shadeAvatar}
          alt="Your Shade"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    if (isAuthenticated && user?.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt="Profile"
          className="w-full h-full object-cover rounded-full opacity-50 grayscale"
        />
      );
    }
    // Default: show favicon
    return (
      <img
        src="/favicon.ico"
        alt="Shade"
        className="w-full h-full object-contain p-2"
      />
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Neon Silhouette Logo Area */}
        <div className="mb-8">
          <h1 className="text-7xl font-bold neon-text-strong neon-pulse tracking-wider mb-4">
            .shade
          </h1>
          <div className="w-32 h-32 mx-auto silhouette-avatar rounded-full breathing-glow mb-6 overflow-hidden flex items-center justify-center">
            {isGenerating ? (
              <div className="text-shade-red-500 text-xs animate-pulse">Generating...</div>
            ) : (
              getAvatarContent()
            )}
          </div>

          {/* Avatar generation button for authenticated users */}
          {isAuthenticated && (
            <div className="flex gap-2 justify-center mb-4">
              <button
                onClick={generateShadeAvatar}
                disabled={isGenerating}
                className="text-xs px-3 py-1 bg-shade-black-800 neon-border text-shade-red-400 rounded hover:neon-glow transition-all disabled:opacity-50"
              >
                Generate Shade Avatar
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-shade-red-500 mb-4">{error}</p>
          )}
        </div>

        {/* Slogan */}
        <p className="text-2xl text-shade-red-300 neon-flicker mb-8 font-light tracking-wide">
          Everyone has a shadow, this is where yours live.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              <p className="text-shade-red-200 mb-4">
                Welcome back, <span className="neon-text">{user?.username}</span>
              </p>
              <Link
                to="/shade/dashboard"
                className="block w-full max-w-xs mx-auto bg-shade-black-900 neon-border-thick text-shade-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:neon-glow-strong transition-all"
              >
                Enter Your Shade
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block w-full max-w-xs mx-auto bg-shade-black-900 neon-border-thick text-shade-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:neon-glow-strong transition-all"
              >
                Login to Enter
              </Link>
              <Link
                to="/register"
                className="block w-full max-w-xs mx-auto bg-shade-black-600 neon-border text-shade-red-300 px-8 py-3 rounded-lg hover:neon-glow transition-all"
              >
                Claim Your Shade
              </Link>
            </>
          )}
        </div>

        {/* Back to Social */}
        <div className="mt-12">
          <Link
            to="/"
            className="text-shade-red-400 hover:text-shade-red-600 transition-colors text-sm"
          >
            ← Return to Social
          </Link>
        </div>
      </div>

      {/* Floating neon particles effect could be added via CSS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-shade-red-600 rounded-full neon-pulse opacity-30" />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-shade-red-500 rounded-full neon-flicker opacity-20" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-shade-red-400 rounded-full breathing-glow opacity-25" />
      </div>
    </main>
  );
}
