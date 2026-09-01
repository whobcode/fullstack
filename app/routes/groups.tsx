import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { GuildPanel } from "../components/social/GuildPanel";
import { apiClient } from "../lib/api";
import type { Group } from "../types/social";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiClient.get<{ data: Group[] }>("/social/groups");
      setGroups(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="social-dark-bg py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header className="rounded-3xl social-dark-card p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Communities</p>
          <h1 className="text-3xl font-bold text-social-blue-300">Groups</h1>
          <p className="mt-2 text-social-blue-400">Join groups to connect with people who share your interests.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl social-dark-card p-5 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-social-blue-400">Featured</p>
                  <h2 className="text-xl font-semibold text-social-blue-300">Popular Groups</h2>
                </div>
                <Link to="/messages" className="text-sm text-social-blue-400 hover:text-social-blue-300 transition-colors">
                  Start a discussion
                </Link>
              </div>
              {error && <p className="text-sm text-social-orange-400 mt-2">{error}</p>}
              <div className="mt-4 space-y-3">
                {groups.length === 0 ? (
                  <p className="text-sm text-social-blue-500">No groups yet. Create one to get started!</p>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between rounded-xl social-dark-card-subtle px-4 py-3">
                      <div>
                        <p className="font-semibold text-social-blue-300">{group.name}</p>
                        <p className="text-xs text-social-blue-500">Created by: {group.owner_username}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-social-blue-400">{group.members} members</span>
                        <button className="rounded-lg social-button px-3 py-1 text-sm font-semibold">
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl social-dark-card p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-social-blue-400">Create</p>
              <h2 className="text-xl font-semibold text-social-blue-300">Start a New Group</h2>
              <p className="mt-1 text-sm text-social-blue-400">Bring people together around shared interests and topics.</p>
              <ul className="mt-3 space-y-2 text-sm text-social-blue-400">
                <li>Create discussion threads</li>
                <li>Share updates with members</li>
                <li>Build your community</li>
              </ul>
              <button className="mt-4 social-button px-4 py-2 rounded-lg font-semibold">
                Create Group
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <GuildPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
