import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const recommendations = [
  { id: "r1", name: "Zara Nightwing", mutual: 6, status: "Active" },
  { id: "r2", name: "Drake Volund", mutual: 3, status: "Online" },
  { id: "r3", name: "Lena Flux", mutual: 4, status: "Away" },
];

const incoming = [
  { id: "p1", name: "Ivy Sol", note: "Wants to connect" },
  { id: "p2", name: "Mako", note: "Mutual friend: Alex" },
];

export default function FriendsPage() {
  const { user } = useAuth();

  return (
    <div className="social-dark-bg py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        <header className="rounded-3xl social-dark-card p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Network</p>
          <h1 className="text-3xl font-bold text-social-blue-300">Friends</h1>
          <p className="mt-2 text-social-blue-400">Connect with people you know and expand your network.</p>
          <div className="mt-3 text-sm text-social-blue-500">Signed in as {user?.username ?? "guest"}</div>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl social-dark-card p-5 shadow">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-social-blue-400">Suggestions</p>
                  <h2 className="text-xl font-semibold text-social-blue-300">People you may know</h2>
                </div>
              </header>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="rounded-xl social-dark-card-subtle p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-social-blue-300">{rec.name}</p>
                        <p className="text-xs text-social-blue-500">{rec.status}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-social-blue-400">{rec.mutual} mutual friends</p>
                    <div className="mt-2 flex gap-2 text-sm">
                      <button className="rounded-lg social-button px-3 py-1 font-semibold">Add Friend</button>
                      <button className="rounded-lg social-button-outline px-3 py-1 text-social-blue-300 border-social-blue-500/50 hover:bg-social-blue-900/30">View Profile</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl social-dark-card p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-social-blue-400">Pending</p>
              <h2 className="text-xl font-semibold text-social-blue-300">Friend Requests</h2>
              <div className="mt-3 space-y-3">
                {incoming.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl social-dark-card-subtle px-3 py-2">
                    <div>
                      <p className="font-semibold text-social-blue-300">{req.name}</p>
                      <p className="text-xs text-social-blue-500">{req.note}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <button className="rounded-lg social-button px-3 py-1 font-semibold">Accept</button>
                      <button className="rounded-lg social-button-outline px-3 py-1 text-social-blue-300 border-social-blue-500/50 hover:bg-social-blue-900/30">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl social-dark-card p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-blue-400">Activity</p>
              <h3 className="text-lg font-semibold text-social-blue-300">Online Friends</h3>
              <ul className="mt-3 space-y-2 text-sm text-social-blue-400">
                <li className="flex justify-between">
                  <span>Close Friends</span>
                  <span className="rounded-full bg-social-blue-900/50 border border-social-blue-500/50 px-2 py-0.5 text-social-blue-300">12 online</span>
                </li>
                <li className="flex justify-between">
                  <span>All Friends</span>
                  <span className="rounded-full bg-social-blue-900/50 border border-social-blue-600/30 px-2 py-0.5 text-social-blue-400">4 away</span>
                </li>
              </ul>
              <Link to="/messages" className="mt-3 inline-block text-xs text-social-blue-400 hover:text-social-blue-300 transition-colors">
                Start a conversation
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
