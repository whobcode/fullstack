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
  async searchUsers(_query: string, _env: Bindings): Promise<NetworkUserResult[]> {
    // Facebook deprecated the /search?type=user endpoint in 2019
    // User search is no longer available to third-party apps
    // The only option is to use user_friends permission which only shows
    // friends who have ALSO authorized the same app
    //
    // For now, return empty results with an explanation
    // Future: implement friend-of-friend discovery via oauth_accounts + user_friends
    throw new Error(
      'Facebook user search is no longer available. ' +
      'Facebook deprecated this feature in 2019. ' +
      'You can only attack players already on the platform or share your invite link directly.'
    );
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
