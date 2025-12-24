import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import type { Group } from "../types/social";

export default function GroupsPage() {
  const { user, isAuthenticated } = useAuth();
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create group form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGroups = async () => {
    try {
      const promises: Promise<any>[] = [
        apiClient.get<{ data: Group[] }>("/social/groups"),
      ];

      if (isAuthenticated) {
        promises.push(apiClient.get<{ data: Group[] }>("/social/groups/my"));
      }

      const results = await Promise.all(promises);
      setAllGroups(results[0].data);
      if (results[1]) {
        setMyGroups(results[1].data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [isAuthenticated]);

  const joinGroup = async (groupId: string) => {
    if (!isAuthenticated) {
      setError("Please log in to join groups");
      return;
    }
    setActionLoading(groupId);
    try {
      await apiClient.post(`/social/groups/${groupId}/join`, {});
      await loadGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setActionLoading(groupId);
    try {
      await apiClient.delete(`/social/groups/${groupId}/leave`);
      await loadGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await apiClient.post("/social/groups", {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });
      setNewGroupName("");
      setNewGroupDescription("");
      setShowCreateForm(false);
      await loadGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Check if user is a member of a group
  const isMember = (groupId: string) => myGroups.some((g) => g.id === groupId);
  const isOwner = (group: Group) => group.owner_id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-social-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header className="rounded-3xl social-panel p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Communities</p>
          <h1 className="text-3xl font-bold text-social-forest-700">Groups</h1>
          <p className="mt-2 text-social-forest-500">Join groups to connect with people who share your interests.</p>
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs text-red-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            {/* All Groups */}
            <div className="rounded-2xl social-panel p-5 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-social-gold-600">Discover</p>
                  <h2 className="text-xl font-semibold text-social-forest-700">All Groups</h2>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {allGroups.length === 0 ? (
                  <p className="text-sm text-social-forest-400">No groups yet. Create one to get started!</p>
                ) : (
                  allGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-4 py-3">
                      <div className="flex-1">
                        <p className="font-semibold text-social-forest-700">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-social-forest-500 mt-1">{group.description}</p>
                        )}
                        <p className="text-xs text-social-forest-400">Created by: {group.owner_username}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-social-forest-500">{group.members} members</span>
                        {isMember(group.id) ? (
                          isOwner(group) ? (
                            <span className="text-xs text-social-gold-600 bg-social-cream-300 px-3 py-1 rounded-lg">Owner</span>
                          ) : (
                            <button
                              onClick={() => leaveGroup(group.id)}
                              disabled={actionLoading === group.id}
                              className="rounded-lg social-button-outline px-3 py-1 text-sm disabled:opacity-50"
                            >
                              {actionLoading === group.id ? "..." : "Leave"}
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => joinGroup(group.id)}
                            disabled={actionLoading === group.id}
                            className="rounded-lg social-button px-3 py-1 text-sm font-semibold disabled:opacity-50"
                          >
                            {actionLoading === group.id ? "..." : "Join"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create Group */}
            {isAuthenticated && (
              <div className="rounded-2xl social-panel p-5 shadow">
                <p className="text-xs uppercase tracking-wide text-social-gold-600">Create</p>
                <h2 className="text-xl font-semibold text-social-forest-700">Start a New Group</h2>

                {showCreateForm ? (
                  <form onSubmit={createGroup} className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full px-4 py-2 border border-social-cream-400 rounded-lg text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    <textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-4 py-2 border border-social-cream-400 rounded-lg text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400 resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating || !newGroupName.trim()}
                        className="social-button px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {creating ? "Creating..." : "Create Group"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewGroupName("");
                          setNewGroupDescription("");
                        }}
                        className="social-button-outline px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-social-forest-500">Bring people together around shared interests and topics.</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="mt-4 social-button px-4 py-2 rounded-lg font-semibold"
                    >
                      Create Group
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            {/* My Groups */}
            <div className="rounded-2xl social-panel p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-gold-600">Your Groups</p>
              <h3 className="text-xl font-semibold text-social-forest-700">My Communities</h3>
              <div className="mt-3 space-y-3">
                {!isAuthenticated ? (
                  <p className="text-sm text-social-forest-400">
                    <Link to="/login" className="text-social-green-600 hover:underline">Log in</Link> to see your groups
                  </p>
                ) : myGroups.length === 0 ? (
                  <p className="text-sm text-social-forest-400">You haven't joined any groups yet.</p>
                ) : (
                  myGroups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2">
                      <div>
                        <p className="font-semibold text-social-forest-700">{g.name}</p>
                        <p className="text-xs text-social-forest-400">
                          {g.owner_id === user?.id ? "You own this" : `by ${g.owner_username}`}
                        </p>
                        <p className="text-xs text-social-gold-600">{g.members} members</p>
                      </div>
                      {g.owner_id !== user?.id && (
                        <button
                          className="text-xs text-social-orange-600 hover:text-social-orange-700"
                          onClick={() => leaveGroup(g.id)}
                          disabled={actionLoading === g.id}
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
