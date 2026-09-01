import { Link } from "react-router-dom";

export function Welcome({ message }: { message: string }) {
  return (
    <main className="social-dark-bg flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-social-blue-400 tracking-wider mb-4">hwmnbn</h1>
              <p className="text-xl text-social-blue-300">Connect. Share. Belong.</p>
            </div>
          </div>
        </header>
        <div className="max-w-[400px] w-full space-y-6 px-4">
          <nav className="rounded-3xl social-dark-card p-6 shadow-xl space-y-4">
            <p className="leading-6 text-social-blue-300 text-center text-lg font-semibold">
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
                className="block w-full text-center border border-social-blue-500/50 text-social-blue-300 hover:bg-social-blue-900/30 px-6 py-3 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </div>
            <div className="pt-4 border-t border-social-blue-600/30 space-y-2">
              <p className="text-sm text-social-blue-400 text-center">Explore what's happening</p>
              <Link
                to="/feed"
                className="block text-center text-social-blue-400 hover:text-social-blue-300 font-medium transition-colors"
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
