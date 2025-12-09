import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { GuildPanel } from "../components/social/GuildPanel";
import { apiClient } from "../lib/api";
import type { Group } from "../types/social";

export default function GroupsPage() {
  const [guilds, setGuilds] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiClient.get<{ data: Group[] }>("/social/groups");
      setGuilds(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl beveled-panel neon-glow p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-shade-red-200/80">Communities</p>
        <h1 className="text-3xl font-bold neon-text">Guilds & Facebook groups</h1>
        <p className="mt-2 text-shade-black-200/80">Blend in-game guilds with your existing Facebook communities so raids fill faster.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl beveled-panel p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-shade-red-200/80">Featured guilds</p>
                <h2 className="text-xl font-semibold neon-text">Find your squad</h2>
              </div>
              <Link to="/messages" className="text-sm text-shade-red-200 hover:text-shade-red-100 hover:neon-glow transition-all">
                Coordinate a run →
              </Link>
            </div>
            {error && <p className="text-sm text-shade-red-500">{error}</p>}
            <div className="mt-4 space-y-3">
              {guilds.length === 0 ? (
                <p className="text-sm text-shade-black-400">No guilds yet. Create one from the admin console.</p>
              ) : (
                guilds.map((guild) => (
                  <div key={guild.id} className="flex items-center justify-between rounded-xl bg-shade-black-600 neon-border px-4 py-3">
                    <div>
                      <p className="font-semibold neon-text">{guild.name}</p>
                      <p className="text-xs text-shade-black-400">Leader: {guild.owner_username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-shade-black-300">{guild.members} members</span>
                      <button className="rounded-lg bg-shade-black-900 neon-border text-shade-red-600 px-3 py-1 text-sm font-semibold hover:neon-glow-strong transition-all">
                        Request to join
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl beveled-panel p-5 shadow">
            <p className="text-xs uppercase tracking-wide text-shade-red-200/80">Cross-platform</p>
            <h2 className="text-xl font-semibold neon-text">Sync a Facebook group to your guild</h2>
            <p className="mt-1 text-sm text-shade-black-300">Link your raid planning threads from Facebook so offline players still see updates.</p>
            <ul className="mt-3 space-y-2 text-sm text-shade-black-200/80">
              <li>• Paste the group URL into guild settings.</li>
              <li>• Decide whether to mirror events or keep them read-only.</li>
              <li>• Auto-post battle recaps into the Facebook group.</li>
            </ul>
          </div>
        </section>

        <aside className="space-y-4">
          <GuildPanel />
        </aside>
      </div>
    </div>
  );
}
