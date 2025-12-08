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
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-sky-900/40 to-slate-950 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-sky-200/80">Allies</p>
        <h1 className="text-3xl font-bold text-white">Friends & party invites</h1>
        <p className="mt-2 text-slate-200/80">Recruit Facebook friends into your turn-based party and track who is online for raids.</p>
        <div className="mt-3 text-sm text-slate-300">Signed in as {user?.username ?? "guest"}</div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-200/80">Recommended squadmates</p>
                <h2 className="text-xl font-semibold text-white">Strong picks for your comp</h2>
              </div>
              <Link to="/game/players" className="text-sm text-emerald-200 hover:text-emerald-100">
                Open matchmaking →
              </Link>
            </header>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{rec.name}</p>
                      <p className="text-xs text-slate-400">{rec.role}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{rec.power} PWR</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{rec.mutual} mutuals from Facebook</p>
                  <div className="mt-2 flex gap-2 text-sm">
                    <button className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500">Invite</button>
                    <button className="rounded-lg bg-slate-800 px-3 py-1 text-slate-100 hover:bg-slate-700">Profile</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
            <p className="text-xs uppercase tracking-wide text-indigo-200/80">Pending requests</p>
            <h2 className="text-xl font-semibold text-white">Answer party calls</h2>
            <div className="mt-3 space-y-3">
              {incoming.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                  <div>
                    <p className="font-semibold text-white">{req.name}</p>
                    <p className="text-xs text-slate-400">{req.note}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500">Accept</button>
                    <button className="rounded-lg bg-slate-800 px-3 py-1 text-slate-100 hover:bg-slate-700">Later</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow">
            <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
            <h3 className="text-lg font-semibold text-white">Who is online</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200/80">
              <li className="flex justify-between">
                <span>Nova Syndicate (guild)</span>
                <span className="rounded-full bg-emerald-700/50 px-2 py-0.5 text-emerald-100">12 online</span>
              </li>
              <li className="flex justify-between">
                <span>Cross-server allies</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">4 standby</span>
              </li>
            </ul>
            <Link to="/messages" className="mt-3 inline-block text-xs text-indigo-200 hover:text-indigo-100">
              Open party chat →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
