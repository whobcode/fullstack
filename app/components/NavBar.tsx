import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export function NavBar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading) {
    return <header className="bg-shade-black-600 neon-border text-shade-red-100 p-4 h-[68px]"></header> // Placeholder for height
  }

  return (
    <header className="bg-shade-black-600 neon-border text-shade-red-100 p-4 shadow-lg">
      <nav className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold neon-text-strong neon-flicker tracking-wider">
          me.shade
        </Link>
        <div className="flex space-x-8">
          {/* Social Section */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-shade-red-600">Social</span>
            <Link to="/feed" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Feed</Link>
            <Link to="/friends" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Friends</Link>
            <Link to="/groups" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Groups</Link>
            <Link to="/messages" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Messages</Link>
          </div>

          <div className="border-l border-shade-red-600 h-6 self-center shadow-[0_0_5px_rgba(255,42,42,0.5)]"></div>

          {/* Game Section */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-shade-red-600">Game</span>
            <Link to="/game/dashboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Dashboard</Link>
            <Link to="/game/storm8" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Battle</Link>
            <Link to="/game/players" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Find Players</Link>
            <Link to="/game/leaderboard" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Leaderboard</Link>
          </div>
        </div>

        {/* User Profile / Auth */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/profile/me" className="text-shade-red-200 hover:text-shade-red-600 transition-colors duration-200">Welcome, {user?.username}</Link>
              <button onClick={handleLogout} className="bg-shade-black-900 neon-border text-shade-red-600 px-4 py-2 rounded hover:neon-glow transition-all duration-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-shade-black-900 neon-border text-shade-red-600 px-4 py-2 rounded hover:neon-glow transition-all duration-200">Login</Link>
              <Link to="/register" className="bg-shade-black-900 neon-border text-shade-red-600 px-4 py-2 rounded hover:neon-glow transition-all duration-200">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
