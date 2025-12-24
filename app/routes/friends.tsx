import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { apiClient } from "../lib/api";

type FriendData = {
  id: string;
  username: string;
  avatar_url: string | null;
  status: "pending" | "accepted";
  requester_id: string;
};

type UserRecommendation = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserRecommendation[]>([]);

  const fetchFriendsData = async () => {
    try {
      const [friendsRes, recsRes] = await Promise.all([
        apiClient.get<{ data: FriendData[] }>("/friends"),
        apiClient.get<{ data: UserRecommendation[] }>("/users/recommendations"),
      ]);
      setFriends(friendsRes.data);
      setRecommendations(recsRes.data);
    } catch (err) {
      console.error("Failed to fetch friends data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ data: UserRecommendation[] }>(
          `/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendFriendRequest = async (addresseeId: string) => {
    setActionLoading(addresseeId);
    try {
      await apiClient.post("/friends/request", { addresseeId });
      setRecommendations((prev) => prev.filter((r) => r.id !== addresseeId));
      setSearchResults((prev) => prev.filter((r) => r.id !== addresseeId));
      await fetchFriendsData();
    } catch (err: any) {
      alert(err.message || "Failed to send friend request");
    } finally {
      setActionLoading(null);
    }
  };

  const respondToRequest = async (requesterId: string, status: "accepted" | "declined") => {
    setActionLoading(requesterId);
    try {
      await apiClient.post("/friends/respond", { requesterId, status });
      await fetchFriendsData();
    } catch (err: any) {
      alert(err.message || "Failed to respond to request");
    } finally {
      setActionLoading(null);
    }
  };

  const unfriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    setActionLoading(friendId);
    try {
      await apiClient.delete(`/friends/${friendId}`);
      await fetchFriendsData();
    } catch (err: any) {
      alert(err.message || "Failed to remove friend");
    } finally {
      setActionLoading(null);
    }
  };

  const incomingRequests = friends.filter(
    (f) => f.status === "pending" && f.requester_id !== user?.id
  );
  const outgoingRequests = friends.filter(
    (f) => f.status === "pending" && f.requester_id === user?.id
  );
  const acceptedFriends = friends.filter((f) => f.status === "accepted");

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
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-3xl social-panel p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-social-green-500/5 to-transparent"></div>
          <div className="relative">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-social-green-600 bg-social-green-100/80 rounded-full uppercase mb-4">
              Your Network
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">Friends</h1>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl">
              Connect with people you know and expand your network.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-social-green-500 animate-pulse"></div>
                <span>Signed in as <span className="text-gray-600 font-medium">{user?.username}</span></span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            {/* Search */}
            <div className="social-panel rounded-2xl p-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for friends..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/80 border-0 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {searchResults.map((u) => (
                    <div key={u.id} className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/50 hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-social-green-500/20">
                            {u.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{u.username}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => sendFriendRequest(u.id)}
                          disabled={actionLoading === u.id}
                          className="flex-1 social-button rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          {actionLoading === u.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending
                            </span>
                          ) : "Add Friend"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="social-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Suggestions</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">People you may know</h2>
                </div>
              </div>
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No recommendations at this time</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/50 hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        {rec.avatar_url ? (
                          <img src={rec.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-social-green-500/20">
                            {rec.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{rec.username}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => sendFriendRequest(rec.id)}
                          disabled={actionLoading === rec.id}
                          className="flex-1 social-button rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          {actionLoading === rec.id ? "..." : "Add Friend"}
                        </button>
                        <Link to={`/profile/${rec.id}`} className="social-button-outline rounded-xl px-4 py-2.5 text-sm">
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Requests */}
            <div className="social-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Pending</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Friend Requests</h2>
                </div>
                {incomingRequests.length > 0 && (
                  <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-social-green-500 to-social-green-600 rounded-full shadow-lg shadow-social-green-500/20">
                    {incomingRequests.length} new
                  </span>
                )}
              </div>
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-100/50 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-4">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white font-bold shadow-lg shadow-social-green-500/20">
                            {req.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{req.username}</p>
                          <p className="text-sm text-gray-500">Wants to connect</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(req.requester_id, "accepted")}
                          disabled={actionLoading === req.requester_id}
                          className="social-button rounded-xl px-5 py-2 text-sm disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(req.requester_id, "declined")}
                          disabled={actionLoading === req.requester_id}
                          className="social-button-outline rounded-xl px-4 py-2 text-sm disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="social-panel rounded-2xl p-6">
                <div className="mb-6">
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Sent</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Pending Requests</h2>
                </div>
                <div className="space-y-3">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-gray-50/50 rounded-2xl p-4">
                      <div className="flex items-center gap-4">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold">
                            {req.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{req.username}</p>
                          <p className="text-sm text-gray-400">Awaiting response</p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="social-panel rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Your Network</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">Friends</h3>
                </div>
                <span className="px-3 py-1 text-sm font-bold text-social-green-600 bg-social-green-100/80 rounded-full">
                  {acceptedFriends.length}
                </span>
              </div>
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No friends yet</p>
                  <p className="text-gray-400 text-xs mt-1">Start connecting!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {acceptedFriends.map((friend) => (
                    <div key={friend.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-sm font-bold">
                            {friend.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-700 text-sm">{friend.username}</span>
                      </div>
                      <button
                        onClick={() => unfriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-all duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link to="/messages" className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-social-green-600 hover:text-social-green-700 hover:bg-social-green-50 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start a conversation
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
