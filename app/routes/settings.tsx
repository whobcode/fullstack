import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="social-dark-bg">
        <div className="max-w-2xl mx-auto p-4">
          <div className="social-dark-card rounded-2xl p-6 text-center">
            <p className="text-social-blue-400">Please log in to access settings.</p>
            <Link to="/login" className="social-button mt-4 inline-block px-6 py-2 rounded-lg">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="social-dark-bg py-6">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Header */}
      <header className="social-dark-card rounded-3xl p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Account</p>
        <h1 className="text-3xl font-bold text-social-blue-300">Settings</h1>
        <p className="mt-2 text-social-blue-400">Manage your account and preferences</p>
      </header>

      {/* Profile Settings */}
      <section className="social-dark-card rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-blue-300 mb-4">Profile</h2>
        <div className="space-y-3">
          <Link
            to="/profile/me"
            className="flex items-center justify-between p-3 rounded-lg social-dark-card-subtle hover:border-social-blue-400 transition-colors"
          >
            <span className="text-social-blue-300">Edit Profile</span>
            <span className="text-social-blue-400">→</span>
          </Link>
        </div>
      </section>

      {/* Account Settings */}
      <section className="social-dark-card rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-blue-300 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-lg social-dark-card-subtle">
            <p className="text-sm text-social-blue-500">Email</p>
            <p className="text-social-blue-300">{user?.email || 'Not set'}</p>
          </div>
          <div className="p-3 rounded-lg social-dark-card-subtle">
            <p className="text-sm text-social-blue-500">Username</p>
            <p className="text-social-blue-300">{user?.username}</p>
          </div>
        </div>
      </section>

      {/* Game Access - Hidden gateway to the game */}
      <section className="social-dark-card rounded-2xl p-5 shadow border-2 border-social-blue-500/50">
        <h2 className="text-xl font-semibold text-social-blue-300 mb-2">Shade RPG</h2>
        <p className="text-sm text-social-blue-400 mb-4">
          Access the shadow realm - an RPG experience hidden within.
        </p>
        <Link
          to="/shade"
          className="block w-full text-center bg-gradient-to-r from-social-blue-700 to-social-blue-900 text-social-blue-100 px-6 py-3 rounded-lg font-semibold hover:from-social-blue-600 hover:to-social-blue-800 transition-all shadow-lg"
        >
          Enter the Shade →
        </Link>
      </section>

      {/* Privacy */}
      <section className="social-dark-card rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-blue-300 mb-4">Privacy</h2>
        <div className="space-y-3 text-sm text-social-blue-400">
          <p>Your data is handled according to our privacy policy.</p>
          <p>Connected via Facebook? You can manage app permissions in your Facebook settings.</p>
        </div>
      </section>
      </div>
    </div>
  );
}
