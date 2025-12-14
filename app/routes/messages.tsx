import { useAuth } from "../lib/AuthContext";

const threads = [
  { id: "t1", name: "Close Friends", preview: "Hey, are you free this weekend?", unread: 3 },
  { id: "t2", name: "Study Group", preview: "Notes uploaded.", unread: 0 },
  { id: "t3", name: "Book Club", preview: "Next meeting Tuesday?", unread: 1 },
];

export default function MessagesPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-social-cream-100 via-social-cream-200 to-social-cream-300 py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        <header className="rounded-3xl social-panel p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Inbox</p>
          <h1 className="text-3xl font-bold text-social-forest-700">Messages</h1>
          <p className="mt-2 text-social-forest-500">Stay in touch with friends and groups.</p>
          <div className="mt-2 text-sm text-social-forest-400">Logged in as {user?.username ?? "guest"}</div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl social-panel p-5 shadow">
              <h2 className="text-xl font-semibold text-social-forest-700">Conversations</h2>
              <div className="mt-3 space-y-3">
                {threads.map((thread) => (
                  <div key={thread.id} className="flex items-center justify-between rounded-xl bg-social-cream-200 border border-social-cream-400 px-4 py-3 hover:bg-social-cream-300 transition-colors cursor-pointer">
                    <div>
                      <p className="font-semibold text-social-forest-700">{thread.name}</p>
                      <p className="text-xs text-social-forest-400">{thread.preview}</p>
                    </div>
                    {thread.unread > 0 && (
                      <span className="rounded-full bg-social-orange-500 text-white px-2 py-1 text-xs font-semibold">{thread.unread}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl social-panel p-5 shadow">
              <h2 className="text-lg font-semibold text-social-forest-700">Start a New Conversation</h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-social-forest-600">
                  <span>To</span>
                  <input className="w-full rounded-lg social-input px-3 py-2" placeholder="Search friends..." />
                </label>
                <label className="space-y-1 text-sm text-social-forest-600">
                  <span>Subject (optional)</span>
                  <input className="w-full rounded-lg social-input px-3 py-2" placeholder="What's this about?" />
                </label>
                <label className="space-y-1 text-sm text-social-forest-600 sm:col-span-2">
                  <span>Message</span>
                  <textarea className="w-full rounded-lg social-input px-3 py-2" rows={3} placeholder="Write your message..." />
                </label>
                <button className="sm:col-span-2 rounded-lg social-button px-4 py-2 font-semibold">
                  Send Message
                </button>
              </form>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl social-panel p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-gold-600">Tip</p>
              <p className="mt-1 text-sm text-social-forest-500">
                Messages are private between you and the recipient. Group messages are visible to all group members.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
