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
    return <header className={`${isShadeRoute ? 'bg-shade-black-600 neon-border text-shade-red-100' : 'bg-social-green-600'} p-4 h-[60px]`}></header>;
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
              ← Back to me
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

  // Social Navigation (Facebook-like blue header)
  return (
    <header className="bg-social-green-600 p-2 shadow-lg sticky top-0 z-50">
      <nav className="container mx-auto flex justify-between items-center">
        {/* Logo and Search */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-3xl font-bold text-white hover:opacity-90 transition-opacity">
            me
          </Link>
          <div className="hidden md:block relative">
            <input
              type="text"
              placeholder="Search me"
              className="bg-social-green-500 text-white placeholder-social-green-200 rounded-full px-4 py-2 w-64 focus:outline-none focus:bg-white focus:text-social-forest-700 focus:placeholder-social-forest-400 transition-colors"
            />
          </div>
        </div>

        {/* Center Navigation - Only show when authenticated */}
        {isAuthenticated && (
          <div className="flex items-center space-x-1">
            <Link
              to="/feed"
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${location.pathname === '/feed' ? 'bg-social-green-500 text-white' : 'text-social-green-100 hover:bg-social-green-500'}`}
            >
              <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </Link>
            <Link
              to="/friends"
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${location.pathname === '/friends' ? 'bg-social-green-500 text-white' : 'text-social-green-100 hover:bg-social-green-500'}`}
            >
              <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </Link>
            <Link
              to="/groups"
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${location.pathname === '/groups' ? 'bg-social-green-500 text-white' : 'text-social-green-100 hover:bg-social-green-500'}`}
            >
              <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </Link>
            <Link
              to="/messages"
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${location.pathname === '/messages' ? 'bg-social-green-500 text-white' : 'text-social-green-100 hover:bg-social-green-500'}`}
            >
              <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </Link>
          </div>
        )}

        {/* Right Side - User */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile/me" className="flex items-center space-x-2 bg-social-green-500 hover:bg-social-green-400 px-3 py-1.5 rounded-full transition-colors">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-social-green-400 flex items-center justify-center text-white text-sm font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white font-medium hidden sm:block">{user?.username}</span>
              </Link>

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="w-10 h-10 rounded-full bg-social-green-500 hover:bg-social-green-400 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 border border-gray-200 overflow-hidden">
                    <Link
                      to="/profile/me"
                      className="flex items-center space-x-3 px-4 py-3 text-social-forest-700 hover:bg-gray-100"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <div className="w-10 h-10 rounded-full bg-social-green-100 flex items-center justify-center">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{user?.username}</p>
                        <p className="text-sm text-gray-500">See your profile</p>
                      </div>
                    </Link>
                    <div className="border-t border-gray-200"></div>
                    <Link
                      to="/settings"
                      className="flex items-center space-x-3 px-4 py-3 text-social-forest-600 hover:bg-gray-100"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                      <span>Settings & Privacy</span>
                    </Link>
                    <Link
                      to="/shade"
                      className="flex items-center space-x-3 px-4 py-3 text-social-forest-600 hover:bg-gray-100"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"/></svg>
                      <span>Enter .shade RPG</span>
                    </Link>
                    <div className="border-t border-gray-200"></div>
                    <button
                      onClick={() => { handleLogout(); setSettingsOpen(false); }}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-social-forest-600 hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/></svg>
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:underline px-3 py-2">Log In</Link>
              <Link to="/register" className="bg-social-gold-500 hover:bg-social-gold-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
