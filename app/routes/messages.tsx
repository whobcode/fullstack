import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/AuthContext";
import { apiClient } from "../lib/api";

type Conversation = {
  id: string;
  username: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_username: string;
  sender_avatar: string | null;
};

type ConversationUser = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type FriendData = {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New conversation state
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await apiClient.get<{ data: Conversation[] }>("/messages/conversations");
      setConversations(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectConversation = async (userId: string) => {
    setSelectedUserId(userId);
    setMessageLoading(true);
    setShowNewConversation(false);
    try {
      const res = await apiClient.get<{ data: { user: ConversationUser; messages: Message[] } }>(
        `/messages/conversations/${userId}`
      );
      setSelectedUser(res.data.user);
      setMessages(res.data.messages);
      // Refresh conversations to update unread counts
      await loadConversations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMessageLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    setSending(true);
    try {
      await apiClient.post("/messages", {
        recipientId: selectedUserId,
        body: newMessage.trim(),
      });
      setNewMessage("");
      // Reload conversation
      await selectConversation(selectedUserId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async () => {
    setShowNewConversation(true);
    setSelectedUserId(null);
    setSelectedUser(null);
    setMessages([]);
    setFriendsLoading(true);
    try {
      const res = await apiClient.get<{ data: FriendData[] }>("/friends");
      // Filter to only accepted friends
      const acceptedFriends = res.data.filter((f) => f.status === "accepted");
      setFriends(acceptedFriends);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFriendsLoading(false);
    }
  };

  const selectFriendToMessage = async (friend: FriendData) => {
    setShowNewConversation(false);
    await selectConversation(friend.id);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

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
          <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Inbox</p>
          <h1 className="text-3xl font-bold text-social-forest-700">Messages</h1>
          <p className="mt-2 text-social-forest-500">Stay in touch with friends.</p>
          <div className="mt-2 text-sm text-social-forest-400">Logged in as {user?.username ?? "guest"}</div>
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs text-red-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3" style={{ minHeight: "500px" }}>
          {/* Conversations List */}
          <section className="space-y-4">
            <div className="rounded-2xl social-panel p-5 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-social-forest-700">Conversations</h2>
                <button
                  onClick={startNewConversation}
                  className="text-sm text-social-green-600 hover:text-social-green-700"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-social-forest-400">No conversations yet. Start one!</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                        selectedUserId === conv.id
                          ? "bg-social-green-100 border border-social-green-300"
                          : "bg-social-cream-200 border border-social-cream-400 hover:bg-social-cream-300"
                      }`}
                    >
                      {conv.avatar_url ? (
                        <img src={conv.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                          {conv.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-social-forest-700 truncate">{conv.username}</p>
                          <span className="text-xs text-social-forest-400">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-social-forest-500 truncate">{conv.last_message}</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="rounded-full bg-social-orange-500 text-white px-2 py-0.5 text-xs font-semibold">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Message Thread */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl social-panel p-5 shadow h-full flex flex-col">
              {showNewConversation ? (
                <>
                  <h2 className="text-lg font-semibold text-social-forest-700 mb-4">Start a New Conversation</h2>
                  {friendsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-social-green-600"></div>
                    </div>
                  ) : friends.length === 0 ? (
                    <p className="text-sm text-social-forest-400">
                      You need to add friends before you can message them.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-social-forest-500 mb-3">Select a friend to message:</p>
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => selectFriendToMessage(friend)}
                          className="flex items-center gap-3 rounded-xl bg-social-cream-200 border border-social-cream-400 px-3 py-2 cursor-pointer hover:bg-social-cream-300 transition-colors"
                        >
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                              {friend.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <p className="font-semibold text-social-forest-700">{friend.username}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : selectedUser ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-social-cream-300">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-social-green-400 flex items-center justify-center text-white font-bold">
                        {selectedUser.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-social-forest-700">{selectedUser.username}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-3" style={{ maxHeight: "350px" }}>
                    {messageLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-social-green-600"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-social-forest-400 text-center">
                        No messages yet. Send one to start the conversation!
                      </p>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isMe
                                  ? "bg-social-green-600 text-white"
                                  : "bg-social-cream-200 border border-social-cream-400 text-social-forest-700"
                              }`}
                            >
                              <p className="text-sm">{msg.body}</p>
                              <p className={`text-xs mt-1 ${isMe ? "text-social-green-100" : "text-social-forest-400"}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={sendMessage} className="pt-4 border-t border-social-cream-300">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-social-cream-400 rounded-full text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="social-button px-4 py-2 rounded-full font-semibold disabled:opacity-50"
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-social-forest-400">
                  <p>Select a conversation or start a new one</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
