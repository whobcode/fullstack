import type { Bindings } from '../bindings';

export type NetworkName = 'facebook' | 'instagram' | 'twitter' | 'tiktok';

export type NetworkUserResult = {
  id: string;
  name: string;
  pictureUrl?: string;
  profileUrl?: string;
  network: NetworkName;
};

export type InviteContext = {
  attackerName: string;
  attackerLevel: number;
  inviteLink: string;
  inviteToken: string;
  messageText: string;
};

export type InviteResult = {
  status: 'sent' | 'failed' | 'skipped' | 'pending';
  errorMessage?: string;
};

export interface SocialNetworkAdapter {
  network: NetworkName;
  searchUsers(query: string, env: Bindings): Promise<NetworkUserResult[]>;
  sendAttackInvite(targetId: string, context: InviteContext, env: Bindings): Promise<InviteResult>;
}

function buildFacebookProfileUrl(id: string) {
  return `https://facebook.com/${id}`;
}

const facebookAdapter: SocialNetworkAdapter = {
  network: 'facebook',
  async searchUsers(query: string, env: Bindings): Promise<NetworkUserResult[]> {
    const token = env.FACEBOOK_GRAPH_TOKEN || env.FACEBOOK_MESSENGER_PAGE_TOKEN || (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET ? `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}` : '');
    if (!token) {
      throw new Error('Missing Facebook Graph API credentials');
    }

    const url = new URL('https://graph.facebook.com/v20.0/search');
    url.searchParams.set('type', 'user');
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'id,name,picture');
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString());
    const json = await res.json<any>();
    if (!res.ok || json.error) {
      const msg = json?.error?.message || 'Facebook search failed';
      throw new Error(msg);
    }

    const data = Array.isArray(json.data) ? json.data : [];
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      pictureUrl: row.picture?.data?.url,
      profileUrl: buildFacebookProfileUrl(row.id),
      network: 'facebook' as NetworkName,
    }));
  },

  async sendAttackInvite(targetId: string, context: InviteContext, env: Bindings): Promise<InviteResult> {
    const token = env.FACEBOOK_MESSENGER_PAGE_TOKEN;
    if (!token) {
      return { status: 'failed', errorMessage: 'Messenger token not configured for Facebook' };
    }

    const endpoint = `https://graph.facebook.com/v20.0/me/messages?access_token=${token}`;
    const payload = {
      messaging_type: 'MESSAGE_TAG',
      tag: 'ACCOUNT_UPDATE',
      recipient: { id: targetId },
      message: { text: context.messageText },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      try {
        const errJson = await res.json<any>();
        const message = errJson?.error?.message || 'Messenger send failed';
        return { status: 'failed', errorMessage: message };
      } catch {
        return { status: 'failed', errorMessage: `Messenger send failed (${res.status})` };
      }
    }

    return { status: 'sent' };
  },
};

const adapters: Record<NetworkName, SocialNetworkAdapter> = {
  facebook: facebookAdapter,
  instagram: {
    network: 'instagram',
    async searchUsers() {
      throw new Error('Instagram search not implemented yet');
    },
    async sendAttackInvite() {
      return { status: 'failed', errorMessage: 'Instagram messaging not wired yet' };
    },
  },
  twitter: {
    network: 'twitter',
    async searchUsers() {
      throw new Error('Twitter search not implemented yet');
    },
    async sendAttackInvite() {
      return { status: 'failed', errorMessage: 'Twitter messaging not wired yet' };
    },
  },
  tiktok: {
    network: 'tiktok',
    async searchUsers() {
      throw new Error('TikTok search not implemented yet');
    },
    async sendAttackInvite() {
      return { status: 'failed', errorMessage: 'TikTok messaging not wired yet' };
    },
  },
};

export function getNetworkAdapter(network: string): SocialNetworkAdapter | null {
  const key = network.toLowerCase() as NetworkName;
  return adapters[key] || null;
}

export function listSupportedNetworks(): NetworkName[] {
  return Object.keys(adapters) as NetworkName[];
}
