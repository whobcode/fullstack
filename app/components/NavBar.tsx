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
    return <header className="bg-gray-800 text-white p-4 h-[68px]"></header> // Placeholder for height
  }

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-white">
          SocialRPG
        </Link>
        <div className="flex space-x-8">
          {/* Social Section */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold">Social</span>
            <Link to="/feed" className="hover:text-gray-300">Feed</Link>
            <Link to="/friends" className="hover:text-gray-300">Friends</Link>
            <Link to="/groups" className="hover:text-gray-300">Groups</Link>
            <Link to="/messages" className="hover:text-gray-300">Messages</Link>
          </div>

          <div className="border-l border-gray-600 h-6 self-center"></div>

          {/* Game Section */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold">Game</span>
            <Link to="/game/dashboard" className="hover:text-gray-300">Dashboard</Link>
            <Link to="/game/storm8" className="hover:text-gray-300">Battle</Link>
            <Link to="/game/players" className="hover:text-gray-300">Find Players</Link>
            <Link to="/game/leaderboard" className="hover:text-gray-300">Leaderboard</Link>
          </div>
        </div>

        {/* User Profile / Auth */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/profile/me" className="hover:text-gray-300">Welcome, {user?.username}</Link>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Login</Link>
              <Link to="/register" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
