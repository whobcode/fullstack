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
    return <header className={`${isShadeRoute ? 'bg-shade-black-600 neon-border text-shade-red-100' : 'bg-gradient-to-r from-social-green-600 to-social-green-500'} p-4 h-[72px]`}></header>;
  }

  // Game/Shade Navigation (neon-red theme)
  if (isShadeRoute) {
    return (
      <header className="bg-shade-black-600 neon-border text-shade-red-100 p-4 shadow-lg">
        <nav className="container mx-auto flex justify-between items-center">
          <Link to="/shade" className="text-2xl font-bold neon-text-strong neon-flicker tracking-wider">
            .shade
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/shade/dashboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Dashboard</Link>
            <Link to="/shade/battle" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Battle</Link>
            <Link to="/shade/players" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Find Players</Link>
            <Link to="/shade/leaderboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Leaderboard</Link>
            <div className="border-l border-shade-red-600 h-6 shadow-[0_0_5px_rgba(255,42,42,0.5)]"></div>
            <Link to="/feed" className="text-shade-red-300 hover:text-shade-red-100 transition-colors duration-200 text-sm">
              Back to me
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

  // Social Navigation - Modern Glassmorphic Design
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-social-green-600/95 to-social-green-500/95 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <nav className="container mx-auto flex justify-between items-center px-4 py-3">
        {/* Logo and Search */}
        <div className="flex items-center gap-4">
          <Link to="/" className="group flex items-center gap-2">
            <span className="text-3xl font-black text-white drop-shadow-lg tracking-tight">me</span>
          </Link>
          <div className="hidden md:block relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search me"
              className="bg-white/15 backdrop-blur-sm text-white placeholder-white/50 rounded-full pl-10 pr-4 py-2.5 w-72 text-sm focus:outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/30 transition-all duration-300 border border-white/10"
            />
          </div>
        </div>

        {/* Center Navigation - Only show when authenticated */}
        {isAuthenticated && (
          <div className="hidden lg:flex items-center bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 gap-1">
            {[
              { to: '/feed', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
              { to: '/friends', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Friends' },
              { to: '/groups', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Groups' },
              { to: '/messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Messages' },
            ].map(({ to, icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`group relative px-8 py-2.5 rounded-xl transition-all duration-300 ${
                  location.pathname === to
                    ? 'bg-white/25 shadow-lg shadow-black/5'
                    : 'hover:bg-white/15'
                }`}
              >
                <svg className={`w-6 h-6 mx-auto transition-transform duration-300 ${location.pathname === to ? 'text-white scale-110' : 'text-white/80 group-hover:scale-105'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                <span className="sr-only">{label}</span>
                {location.pathname === to && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full shadow-lg" />
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Right Side - User */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile/me" className="group flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-2 rounded-full transition-all duration-300 border border-white/10">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/30 transition-all duration-300 group-hover:ring-white/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/30 transition-all duration-300 group-hover:ring-white/50">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white font-medium hidden sm:block text-sm">{user?.username}</span>
              </Link>

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-300 border border-white/10"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                </button>
                {settingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-50 border border-gray-100/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        to="/profile/me"
                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors"
                        onClick={() => setSettingsOpen(false)}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-social-green-500/20">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user?.username}</p>
                          <p className="text-sm text-gray-500">View your profile</p>
                        </div>
                      </Link>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <div className="py-2">
                        <Link
                          to="/settings"
                          className="flex items-center gap-4 px-5 py-3 text-gray-700 hover:bg-gray-50/80 transition-colors"
                          onClick={() => setSettingsOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                          </div>
                          <span className="font-medium">Settings & Privacy</span>
                        </Link>
                        <Link
                          to="/shade"
                          className="flex items-center gap-4 px-5 py-3 text-gray-700 hover:bg-gray-50/80 transition-colors"
                          onClick={() => setSettingsOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"/></svg>
                          </div>
                          <span className="font-medium">Enter .shade RPG</span>
                        </Link>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <div className="py-2">
                        <button
                          onClick={() => { handleLogout(); setSettingsOpen(false); }}
                          className="flex items-center gap-4 w-full px-5 py-3 text-gray-700 hover:bg-gray-50/80 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/></svg>
                          </div>
                          <span className="font-medium">Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-white/90 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-colors hover:bg-white/10">
                Log In
              </Link>
              <Link to="/register" className="bg-white text-social-green-600 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
