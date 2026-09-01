import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useState } from "react";

export function NavBar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isShadeRoute = location.pathname.startsWith('/shade');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading) {
    return <header className={`${isShadeRoute ? 'bg-shade-black-600 neon-border text-shade-red-100' : 'social-dark-nav'} p-4 h-[68px]`}></header>;
  }

  // Game/Shade Navigation (neon-red theme)
  if (isShadeRoute) {
    return (
      <header className="bg-shade-black-600 neon-border text-shade-red-100 p-4 shadow-lg">
        <nav className="container mx-auto flex justify-between items-center">
          <Link to="/shade" className="text-2xl font-bold neon-text-strong neon-flicker tracking-wider">
            SHADE
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/shade/dashboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Dashboard</Link>
            <Link to="/shade/battle" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Battle</Link>
            <Link to="/shade/players" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Find Players</Link>
            <Link to="/shade/leaderboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Leaderboard</Link>
            <div className="border-l border-shade-red-600 h-6 shadow-[0_0_5px_rgba(255,42,42,0.5)]"></div>
            <Link to="/feed" className="text-shade-red-300 hover:text-shade-red-100 transition-colors duration-200 text-sm">
              ← Social Feed
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-shade-red-200">{user?.username}</span>
                <button onClick={handleLogout} className="bg-shade-black-900 neon-border text-shade-red-600 px-4 py-2 rounded hover:neon-glow transition-all duration-200">Logout</button>
              </>
            ) : (
              <Link to="/login" className="bg-shade-black-900 neon-border text-shade-red-600 px-4 py-2 rounded hover:neon-glow transition-all duration-200">Login</Link>
            )}
          </div>
        </nav>
      </header>
    );
  }

  // Social Navigation (dark theme with blue accents)
  return (
    <header className="bg-black/90 border-b border-social-blue-600/30 p-4 shadow-lg">
      <nav className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-social-blue-400 hover:text-social-blue-300 transition-colors tracking-wide">
          hwmnbn
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/feed" className="text-social-blue-400 hover:text-social-blue-300 transition-colors duration-200">Feed</Link>
          <Link to="/friends" className="text-social-blue-400 hover:text-social-blue-300 transition-colors duration-200">Friends</Link>
          <Link to="/groups" className="text-social-blue-400 hover:text-social-blue-300 transition-colors duration-200">Groups</Link>
          <Link to="/messages" className="text-social-blue-400 hover:text-social-blue-300 transition-colors duration-200">Messages</Link>
        </div>

        {/* User Profile / Auth / Settings */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/profile/me" className="text-social-blue-400 hover:text-social-blue-300 transition-colors duration-200">
                {user?.username}
              </Link>
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="border border-social-blue-500/50 text-social-blue-300 px-3 py-2 rounded-lg hover:bg-social-blue-900/30 transition-colors"
                >
                  ⚙
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 social-dark-card rounded-lg shadow-xl z-50">
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-social-blue-300 hover:bg-social-blue-900/30 rounded-t-lg"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Settings
                    </Link>
                    <Link
                      to="/shade"
                      className="block px-4 py-2 text-social-blue-400 hover:bg-social-blue-900/30 border-t border-social-blue-600/30"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Enter Shade RPG →
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setSettingsOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-social-orange-400 hover:bg-social-blue-900/30 rounded-b-lg border-t border-social-blue-600/30"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="border border-social-blue-500/50 text-social-blue-300 px-4 py-2 rounded-lg hover:bg-social-blue-900/30 transition-colors">Login</Link>
              <Link to="/register" className="social-button px-4 py-2 rounded-lg">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
