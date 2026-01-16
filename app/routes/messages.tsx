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
              Inbox
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">Messages</h1>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl">
              Stay in touch with friends.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-social-green-500 animate-pulse"></div>
                <span>Signed in as <span className="text-gray-600 font-medium">{user?.username ?? "guest"}</span></span>
              </div>
            </div>
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

        <div className="grid gap-8 lg:grid-cols-3" style={{ minHeight: "500px" }}>
          {/* Conversations List */}
          <section className="space-y-6">
            <div className="social-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Your Chats</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Conversations</h2>
                </div>
                <button
                  onClick={startNewConversation}
                  className="social-button rounded-xl px-4 py-2 text-sm"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No conversations yet</p>
                    <p className="text-gray-400 text-xs mt-1">Start one!</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`flex items-center gap-4 rounded-2xl p-4 cursor-pointer transition-all duration-300 ${
                        selectedUserId === conv.id
                          ? "bg-social-green-50 border border-social-green-200 shadow-md shadow-social-green-500/10"
                          : "bg-white/60 backdrop-blur-sm border border-gray-100/50 hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5"
                      }`}
                    >
                      {conv.avatar_url ? (
                        <img src={conv.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white font-bold shadow-lg shadow-social-green-500/20">
                          {conv.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">{conv.username}</p>
                          <span className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-social-green-500 to-social-green-600 rounded-full shadow-lg shadow-social-green-500/20">
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
            <div className="social-panel rounded-2xl p-6 h-full flex flex-col">
              {showNewConversation ? (
                <>
                  <div className="mb-6">
                    <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">New Chat</span>
                    <h2 className="text-xl font-bold text-gray-900 mt-1">Start a Conversation</h2>
                  </div>
                  {friendsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-social-green-200 rounded-full animate-spin border-t-social-green-600"></div>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">You need to add friends before you can message them.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 mb-4">Select a friend to message:</p>
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => selectFriendToMessage(friend)}
                          className="flex items-center gap-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100/50 p-4 cursor-pointer hover:border-social-green-200 hover:shadow-lg hover:shadow-social-green-500/5 transition-all duration-300"
                        >
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white font-bold shadow-lg shadow-social-green-500/20">
                              {friend.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <p className="font-semibold text-gray-900">{friend.username}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : selectedUser ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white font-bold shadow-lg shadow-social-green-500/20">
                        {selectedUser.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{selectedUser.username}</p>
                      <p className="text-sm text-gray-400">Active now</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-3" style={{ maxHeight: "350px" }}>
                    {messageLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-10 h-10 border-4 border-social-green-200 rounded-full animate-spin border-t-social-green-600"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No messages yet. Send one to start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                                isMe
                                  ? "bg-gradient-to-r from-social-green-500 to-social-green-600 text-white shadow-lg shadow-social-green-500/20"
                                  : "bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-900"
                              }`}
                            >
                              <p className="text-sm">{msg.body}</p>
                              <p className={`text-xs mt-1 ${isMe ? "text-social-green-100" : "text-gray-400"}`}>
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
                  <form onSubmit={sendMessage} className="pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-5 py-3 bg-gray-50/80 border-0 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-social-green-500/30 focus:bg-white transition-all duration-300"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="social-button rounded-2xl px-6 py-3 font-semibold disabled:opacity-50"
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Select a conversation or start a new one</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
