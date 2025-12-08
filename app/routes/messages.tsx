import { useAuth } from "../lib/AuthContext";

const threads = [
  { id: "t1", name: "Siege Team", preview: "Need more potions before 9pm.", unread: 3 },
  { id: "t2", name: "Crafting Crew", preview: "Blueprint uploaded.", unread: 0 },
  { id: "t3", name: "Arena Spar", preview: "Best-of-3 tonight?", unread: 1 },
];

export default function MessagesPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-950 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-purple-200/80">Comms</p>
        <h1 className="text-3xl font-bold text-white">Messages & battle calls</h1>
        <p className="mt-2 text-slate-200/80">Spin up a raid thread here, then escalate to Facebook Messenger when you need instant pings.</p>
        <div className="mt-2 text-sm text-slate-300">Logged in as {user?.username ?? "guest"}</div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
            <h2 className="text-xl font-semibold text-white">Party threads</h2>
            <div className="mt-3 space-y-3">
              {threads.map((thread) => (
                <div key={thread.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{thread.name}</p>
                    <p className="text-xs text-slate-400">{thread.preview}</p>
                  </div>
                  {thread.unread > 0 && (
                    <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">{thread.unread}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow">
            <h2 className="text-lg font-semibold text-white">Create a new squad channel</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-200/80">
                <span>Name</span>
                <input className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2" placeholder="Friday Siege" />
              </label>
              <label className="space-y-1 text-sm text-slate-200/80">
                <span>Purpose</span>
                <select className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <option>Raid prep</option>
                  <option>Scrim</option>
                  <option>Trade</option>
                  <option>Coaching</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-200/80 sm:col-span-2">
                <span>Notes</span>
                <textarea className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2" rows={3} placeholder="Ping tanks first, need healers on standby." />
              </label>
              <button className="sm:col-span-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500">
                Create & invite
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tip</p>
            <p className="mt-1 text-sm text-slate-200/80">
              Use squad threads to coordinate turns; push notifications can be added later via your own backend.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
