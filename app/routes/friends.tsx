import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const recommendations = [
  { id: "r1", name: "Zara Nightwing", mutual: 6, role: "Healer", power: 5120 },
  { id: "r2", name: "Drake Volund", mutual: 3, role: "Tank", power: 6870 },
  { id: "r3", name: "Lena Flux", mutual: 4, role: "Mage", power: 4430 },
];

const incoming = [
  { id: "p1", name: "Ivy Sol", note: "Raid invite for Friday Siege" },
  { id: "p2", name: "Mako", note: "1v1 arena practice" },
];

export default function FriendsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <header className="rounded-3xl beveled-panel p-6 shadow-xl neon-glow">
        <p className="text-xs uppercase tracking-[0.25rem] text-shade-red-600">Allies</p>
        <h1 className="text-3xl font-bold neon-text">Friends & party invites</h1>
        <p className="mt-2 text-shade-red-200">Recruit Facebook friends into your turn-based party and track who is online for raids.</p>
        <div className="mt-3 text-sm text-shade-red-300">Signed in as {user?.username ?? "guest"}</div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl beveled-panel p-5 shadow">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-shade-red-600">Recommended squadmates</p>
                <h2 className="text-xl font-semibold neon-text">Strong picks for your comp</h2>
              </div>
              <Link to="/game/players" className="text-sm text-shade-red-600 hover:neon-text transition-all">
                Open matchmaking →
              </Link>
            </header>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="rounded-xl neon-border bg-shade-black-600 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-shade-red-100">{rec.name}</p>
                      <p className="text-xs text-shade-red-300">{rec.role}</p>
                    </div>
                    <span className="rounded-full bg-shade-black-900 neon-border px-2 py-1 text-xs text-shade-red-200">{rec.power} PWR</span>
                  </div>
                  <p className="mt-1 text-xs text-shade-red-400">{rec.mutual} mutuals from Facebook</p>
                  <div className="mt-2 flex gap-2 text-sm">
                    <button className="rounded-lg bg-shade-black-900 neon-border px-3 py-1 font-semibold text-shade-red-600 hover:neon-glow transition-all">Invite</button>
                    <button className="rounded-lg bg-shade-black-900 neon-border px-3 py-1 text-shade-red-200 hover:neon-glow transition-all">Profile</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl beveled-panel p-5 shadow">
            <p className="text-xs uppercase tracking-wide text-shade-red-600">Pending requests</p>
            <h2 className="text-xl font-semibold neon-text">Answer party calls</h2>
            <div className="mt-3 space-y-3">
              {incoming.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl bg-shade-black-600 neon-border px-3 py-2">
                  <div>
                    <p className="font-semibold text-shade-red-100">{req.name}</p>
                    <p className="text-xs text-shade-red-300">{req.note}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button className="rounded-lg bg-shade-black-900 neon-border px-3 py-1 font-semibold text-shade-red-600 hover:neon-glow transition-all">Accept</button>
                    <button className="rounded-lg bg-shade-black-900 neon-border px-3 py-1 text-shade-red-200 hover:neon-glow transition-all">Later</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl beveled-panel p-4 shadow">
            <p className="text-xs uppercase tracking-wide text-shade-red-600">Status</p>
            <h3 className="text-lg font-semibold neon-text">Who is online</h3>
            <ul className="mt-3 space-y-2 text-sm text-shade-red-200">
              <li className="flex justify-between">
                <span>Nova Syndicate (guild)</span>
                <span className="rounded-full bg-shade-black-500 neon-border px-2 py-0.5 text-shade-red-600 breathing-glow">12 online</span>
              </li>
              <li className="flex justify-between">
                <span>Cross-server allies</span>
                <span className="rounded-full bg-shade-black-600 neon-border px-2 py-0.5 text-shade-red-300">4 standby</span>
              </li>
            </ul>
            <Link to="/messages" className="mt-3 inline-block text-xs text-shade-red-600 hover:neon-text transition-all">
              Open party chat →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
