import { useAuth } from "../lib/AuthContext";

const threads = [
  { id: "t1", name: "Close Friends", preview: "Hey, are you free this weekend?", unread: 3 },
  { id: "t2", name: "Study Group", preview: "Notes uploaded.", unread: 0 },
  { id: "t3", name: "Book Club", preview: "Next meeting Tuesday?", unread: 1 },
];

export default function MessagesPage() {
  const { user } = useAuth();

  return (
    <div className="social-dark-bg py-6">
      <div className="max-w-6xl mx-auto px-4 space-y-5">
        <header className="rounded-3xl social-dark-card p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25rem] text-social-blue-400">Inbox</p>
          <h1 className="text-3xl font-bold text-social-blue-300">Messages</h1>
          <p className="mt-2 text-social-blue-400">Stay in touch with friends and groups.</p>
          <div className="mt-2 text-sm text-social-blue-500">Logged in as {user?.username ?? "guest"}</div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl social-dark-card p-5 shadow">
              <h2 className="text-xl font-semibold text-social-blue-300">Conversations</h2>
              <div className="mt-3 space-y-3">
                {threads.map((thread) => (
                  <div key={thread.id} className="flex items-center justify-between rounded-xl social-dark-card-subtle px-4 py-3 hover:border-social-blue-400 transition-colors cursor-pointer">
                    <div>
                      <p className="font-semibold text-social-blue-300">{thread.name}</p>
                      <p className="text-xs text-social-blue-500">{thread.preview}</p>
                    </div>
                    {thread.unread > 0 && (
                      <span className="rounded-full bg-social-orange-500 text-white px-2 py-1 text-xs font-semibold">{thread.unread}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl social-dark-card p-5 shadow">
              <h2 className="text-lg font-semibold text-social-blue-300">Start a New Conversation</h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-social-blue-400">
                  <span>To</span>
                  <input className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none" placeholder="Search friends..." />
                </label>
                <label className="space-y-1 text-sm text-social-blue-400">
                  <span>Subject (optional)</span>
                  <input className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none" placeholder="What's this about?" />
                </label>
                <label className="space-y-1 text-sm text-social-blue-400 sm:col-span-2">
                  <span>Message</span>
                  <textarea className="w-full rounded-lg bg-black/50 border border-social-blue-600/30 text-social-blue-200 px-3 py-2 placeholder:text-social-blue-600 focus:border-social-blue-400 focus:outline-none" rows={3} placeholder="Write your message..." />
                </label>
                <button className="sm:col-span-2 rounded-lg social-button px-4 py-2 font-semibold">
                  Send Message
                </button>
              </form>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl social-dark-card p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-social-blue-400">Tip</p>
              <p className="mt-1 text-sm text-social-blue-400">
                Messages are private between you and the recipient. Group messages are visible to all group members.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
