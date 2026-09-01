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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-social-green-200 rounded-full animate-spin border-t-social-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="relative overflow-hidden rounded-3xl social-panel p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-social-green-500/5 to-transparent"></div>
          <div className="relative">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-social-green-600 bg-social-green-100/80 rounded-full uppercase mb-4">
              Communities
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">Groups</h1>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl">
              Join groups to connect with people who share your interests.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs text-red-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            {/* All Groups */}
            <div className="social-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Discover</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">All Groups</h2>
                </div>
              </div>
              <div className="space-y-3">
                {allGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No groups yet. Create one to get started!</p>
                  </div>
                ) : (
                  allGroups.map((group) => (
                    <div key={group.id} className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/50 hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{group.name}</p>
                          {group.description && (
                            <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Created by: {group.owner_username}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <span className="px-3 py-1 text-xs font-medium text-social-green-600 bg-social-green-100/80 rounded-full">
                            {group.members} members
                          </span>
                          {isMember(group.id) ? (
                            isOwner(group) ? (
                              <span className="px-3 py-1 text-xs font-bold text-social-gold-600 bg-social-gold-100 rounded-full">Owner</span>
                            ) : (
                              <button
                                onClick={() => leaveGroup(group.id)}
                                disabled={actionLoading === group.id}
                                className="social-button-outline rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                              >
                                {actionLoading === group.id ? "..." : "Leave"}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => joinGroup(group.id)}
                              disabled={actionLoading === group.id}
                              className="social-button rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                            >
                              {actionLoading === group.id ? "..." : "Join"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create Group */}
            {isAuthenticated && (
              <div className="social-panel rounded-2xl p-6">
                <div className="mb-6">
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Create</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Start a New Group</h2>
                </div>

                {showCreateForm ? (
                  <form onSubmit={createGroup} className="space-y-4">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full px-5 py-4 bg-gray-50/80 border-0 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    <textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-5 py-4 bg-gray-50/80 border-0 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300 resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={creating || !newGroupName.trim()}
                        className="social-button rounded-xl px-6 py-3 font-semibold disabled:opacity-50"
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
                        className="social-button-outline rounded-xl px-6 py-3"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-gray-500">Bring people together around shared interests and topics.</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="mt-4 social-button rounded-xl px-6 py-3 font-semibold"
                    >
                      Create Group
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            {/* My Groups */}
            <div className="social-panel rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Your Groups</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">My Communities</h3>
                </div>
                {myGroups.length > 0 && (
                  <span className="px-3 py-1 text-sm font-bold text-social-green-600 bg-social-green-100/80 rounded-full">
                    {myGroups.length}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      <Link to="/login" className="text-social-green-600 hover:text-social-green-700 font-medium">Log in</Link> to see your groups
                    </p>
                  </div>
                ) : myGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No groups yet</p>
                    <p className="text-gray-400 text-xs mt-1">Join one to get started!</p>
                  </div>
                ) : (
                  myGroups.map((g) => (
                    <div key={g.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 text-sm">{g.name}</p>
                        <p className="text-xs text-gray-400">
                          {g.owner_id === user?.id ? "You own this" : `by ${g.owner_username}`}
                        </p>
                        <p className="text-xs text-social-green-600 font-medium">{g.members} members</p>
                      </div>
                      {g.owner_id !== user?.id && (
                        <button
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-all duration-200"
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
