import { Link } from "react-router-dom";

export function Welcome({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-social-gold-600 tracking-wider mb-4">hwmnbn</h1>
              <p className="text-xl text-social-navy-600">Connect. Share. Belong.</p>
            </div>
          </div>
        </header>
        <div className="max-w-[400px] w-full space-y-6 px-4">
          <nav className="rounded-3xl social-panel p-6 shadow-xl space-y-4">
            <p className="leading-6 text-social-navy-700 text-center text-lg font-semibold">
              Join the community
            </p>
            <div className="space-y-3">
              <Link
                to="/register"
                className="block w-full text-center social-button px-6 py-3 rounded-lg font-semibold"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="block w-full text-center social-button-outline px-6 py-3 rounded-lg"
              >
                Sign In
              </Link>
            </div>
            <div className="pt-4 border-t border-social-cream-300 space-y-2">
              <p className="text-sm text-social-navy-500 text-center">Explore what's happening</p>
              <Link
                to="/feed"
                className="block text-center text-social-orange-600 hover:text-social-orange-700 font-medium"
              >
                View Public Feed
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
