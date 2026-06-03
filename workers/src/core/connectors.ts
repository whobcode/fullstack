/**
 * Cross-platform connectors. A connector knows how to pull a normalized list of posts
 * from an external source so they can be imported into fullstack's unified feed.
 *
 * Feasible-today connectors (no app review needed):
 *   - mastodon: public statuses via the instance API
 *   - rss:      any RSS/Atom feed (Substack, YouTube, blogs, many platforms expose one)
 * Proprietary networks (twitter/x, facebook, instagram) require platform OAuth + app review,
 * so they are represented as stubs plus the generic `push` import path (POST /api/sync/import).
 */

export interface NormalizedPost {
  externalId: string;
  authorHandle?: string;
  body: string;
  url?: string;
  postedAt?: string; // ISO
  raw?: unknown;
}

export interface ConnectorContext { handle: string; accessToken?: string | null; }
export interface SocialConnector {
  provider: string;
  /** True if this connector can run without per-user OAuth/app review. */
  selfServe: boolean;
  fetchPosts(ctx: ConnectorContext): Promise<NormalizedPost[]>;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// ---- Mastodon (public) ----
const mastodon: SocialConnector = {
  provider: "mastodon",
  selfServe: true,
  async fetchPosts({ handle }) {
    // handle: @user@instance  OR  user@instance
    const m = handle.replace(/^@/, "").match(/^([^@]+)@(.+)$/);
    if (!m) throw new Error("mastodon handle must look like user@instance.social");
    const [, user, instance] = m;
    const base = `https://${instance}`;
    const lookup = await fetch(`${base}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`, { headers: { "User-Agent": "fullstack-sync" } });
    if (!lookup.ok) throw new Error(`mastodon account lookup failed (${lookup.status})`);
    const acct = (await lookup.json()) as { id: string };
    const res = await fetch(`${base}/api/v1/accounts/${acct.id}/statuses?limit=20&exclude_replies=true`, { headers: { "User-Agent": "fullstack-sync" } });
    if (!res.ok) throw new Error(`mastodon statuses failed (${res.status})`);
    const statuses = (await res.json()) as any[];
    return statuses.map((s) => ({
      externalId: String(s.id),
      authorHandle: `@${user}@${instance}`,
      body: stripHtml(s.content || ""),
      url: s.url || s.uri,
      postedAt: s.created_at,
      raw: s,
    }));
  },
};

// ---- RSS / Atom (generic) ----
const rss: SocialConnector = {
  provider: "rss",
  selfServe: true,
  async fetchPosts({ handle }) {
    if (!/^https?:\/\//.test(handle)) throw new Error("rss handle must be a feed URL");
    const res = await fetch(handle, { headers: { "User-Agent": "fullstack-sync" } });
    if (!res.ok) throw new Error(`rss fetch failed (${res.status})`);
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/).slice(1).concat(xml.split(/<entry[\s>]/).slice(1));
    const pick = (block: string, tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? m[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() : "";
    };
    return items.slice(0, 20).map((block, i) => {
      const link = pick(block, "link") || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
      const guid = pick(block, "guid") || link || String(i);
      return {
        externalId: guid,
        body: stripHtml(pick(block, "title")) + (pick(block, "description") ? " — " + stripHtml(pick(block, "description")).slice(0, 280) : ""),
        url: link,
        postedAt: pick(block, "pubDate") || pick(block, "updated") || undefined,
        raw: undefined,
      };
    });
  },
};

// ---- Proprietary stubs (require OAuth + platform app review) ----
function oauthStub(provider: string): SocialConnector {
  return {
    provider,
    selfServe: false,
    async fetchPosts() {
      throw new Error(`${provider} requires OAuth + platform app review. Use POST /api/sync/import to push normalized posts from your ${provider} integration instead.`);
    },
  };
}

export const CONNECTORS: Record<string, SocialConnector> = {
  mastodon,
  rss,
  bluesky: oauthStub("bluesky"),
  twitter: oauthStub("twitter"),
  facebook: oauthStub("facebook"),
  instagram: oauthStub("instagram"),
};

export function getConnector(provider: string): SocialConnector | null {
  return CONNECTORS[provider] ?? null;
}
