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

  // Search users
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
      // Remove from recommendations
      setRecommendations((prev) => prev.filter((r) => r.id !== addresseeId));
      setSearchResults((prev) => prev.filter((r) => r.id !== addresseeId));
      // Refresh friends list
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

  // Separate pending requests (incoming) from accepted friends
  const incomingRequests = friends.filter(
    (f) => f.status === "pending" && f.requester_id !== user?.id
  );
  const outgoingRequests = friends.filter(
    (f) => f.status === "pending" && f.requester_id === user?.id
  );
  const acceptedFriends = friends.filter((f) => f.status === "accepted");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-social-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        <header className="rounded-3xl social-panel p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Network</p>
          <h1 className="text-3xl font-bold text-social-forest-700">Friends</h1>
          <p className="mt-2 text-social-forest-500">Connect with people you know and expand your network.</p>
          <div className="mt-3 text-sm text-social-forest-400">Signed in as {user?.username ?? "guest"}</div>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="rounded-2xl social-panel p-5 shadow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full px-4 py-2 border border-social-cream-400 rounded-full text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400"
              />
              {searchResults.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="rounded-xl bg-social-cream-200 border border-social-cream-400 p-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-social-forest-700">{user.username}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 text-sm">
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          disabled={actionLoading === user.id}
                          className="rounded-lg social-button px-3 py-1 font-semibold disabled:opacity-50"
                        >
                          {actionLoading === user.id ? "..." : "Add Friend"}
                        </button>
                        <Link to={`/profile/${user.id}`} className="rounded-lg social-button-outline px-3 py-1">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="rounded-2xl social-panel p-5 shadow">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-social-gold-600">Suggestions</p>
                  <h2 className="text-xl font-semibold text-social-forest-700">People you may know</h2>
                </div>
              </header>
              {recommendations.length === 0 ? (
                <p className="mt-3 text-sm text-social-forest-400">No recommendations at this time.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="rounded-xl bg-social-cream-200 border border-social-cream-400 p-3">
                      <div className="flex items-center gap-3">
                        {rec.avatar_url ? (
                          <img src={rec.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                            {rec.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-social-forest-700">{rec.username}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 text-sm">
                        <button
                          onClick={() => sendFriendRequest(rec.id)}
                          disabled={actionLoading === rec.id}
                          className="rounded-lg social-button px-3 py-1 font-semibold disabled:opacity-50"
                        >
                          {actionLoading === rec.id ? "..." : "Add Friend"}
                        </button>
                        <Link to={`/profile/${rec.id}`} className="rounded-lg social-button-outline px-3 py-1">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Requests */}
            <div className="rounded-2xl social-panel p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-social-gold-600">Pending</p>
              <h2 className="text-xl font-semibold text-social-forest-700">Friend Requests</h2>
              {incomingRequests.length === 0 ? (
                <p className="mt-3 text-sm text-social-forest-400">No pending requests.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2">
                      <div className="flex items-center gap-3">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                            {req.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-social-forest-700">{req.username}</p>
                          <p className="text-xs text-social-forest-400">Wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <button
                          onClick={() => respondToRequest(req.requester_id, "accepted")}
                          disabled={actionLoading === req.requester_id}
                          className="rounded-lg social-button px-3 py-1 font-semibold disabled:opacity-50"
                        >
                          {actionLoading === req.requester_id ? "..." : "Accept"}
                        </button>
                        <button
                          onClick={() => respondToRequest(req.requester_id, "declined")}
                          disabled={actionLoading === req.requester_id}
                          className="rounded-lg social-button-outline px-3 py-1 disabled:opacity-50"
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
              <div className="rounded-2xl social-panel p-5 shadow">
                <p className="text-xs uppercase tracking-wide text-social-gold-600">Sent</p>
                <h2 className="text-xl font-semibold text-social-forest-700">Pending Requests</h2>
                <div className="mt-3 space-y-3">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2">
                      <div className="flex items-center gap-3">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                            {req.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-social-forest-700">{req.username}</p>
                          <p className="text-xs text-social-forest-400">Awaiting response</p>
                        </div>
                      </div>
                      <span className="text-xs text-social-forest-400 bg-social-cream-300 px-2 py-1 rounded-full">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            {/* Accepted Friends */}
            <div className="rounded-2xl social-panel p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-gold-600">Your Network</p>
              <h3 className="text-lg font-semibold text-social-forest-700">Friends ({acceptedFriends.length})</h3>
              {acceptedFriends.length === 0 ? (
                <p className="mt-3 text-sm text-social-forest-400">No friends yet. Start connecting!</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {acceptedFriends.map((friend) => (
                    <li key={friend.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-social-green-400 flex items-center justify-center text-white text-sm font-bold">
                            {friend.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-social-forest-600">{friend.username}</span>
                      </div>
                      <button
                        onClick={() => unfriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="text-xs text-social-orange-600 hover:text-social-orange-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/messages" className="mt-3 inline-block text-xs text-social-orange-600 hover:text-social-orange-700 transition-colors">
                Start a conversation
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
