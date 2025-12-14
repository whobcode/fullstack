import { Link } from "react-router-dom";

export function Welcome({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-social-cream-100">
      {/* Hero Section */}
      <div className="bg-social-green-600 py-8">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left - Branding */}
          <div className="text-center lg:text-left lg:max-w-md">
            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-4">me</h1>
            <p className="text-xl lg:text-2xl text-social-green-100">
              Connect with friends and the world around you on me.
            </p>
          </div>

          {/* Right - Login Card */}
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 space-y-4">
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-social-green-500 text-lg"
              />
              <Link
                to="/login"
                className="block w-full bg-social-green-600 hover:bg-social-green-700 text-white text-xl font-bold py-3 rounded-lg text-center transition-colors"
              >
                Log In
              </Link>
            </form>
            <div className="text-center">
              <Link to="/login" className="text-social-green-600 hover:underline text-sm">
                Forgotten password?
              </Link>
            </div>
            <div className="border-t border-gray-300 pt-4">
              <Link
                to="/register"
                className="block w-full bg-social-gold-500 hover:bg-social-gold-600 text-white text-lg font-bold py-3 rounded-lg text-center transition-colors"
              >
                Create New Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-social-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-social-forest-700 mb-2">Connect with Friends</h3>
            <p className="text-social-forest-500">Find and connect with friends, family, and people who share your interests.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-social-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-social-forest-700 mb-2">Share Your Moments</h3>
            <p className="text-social-forest-500">Post updates, photos, and stories to share what matters most to you.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-social-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-social-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-social-forest-700 mb-2">Join Communities</h3>
            <p className="text-social-forest-500">Discover groups and communities that match your passions and interests.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-social-cream-200 py-8">
        <div className="container mx-auto px-4 text-center text-social-forest-500 text-sm">
          <p>&copy; 2024 me. Connect with friends and the world around you.</p>
        </div>
      </footer>
    </main>
  );
}
