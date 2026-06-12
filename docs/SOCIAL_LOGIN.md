# Social login (OAuth)

The site supports several ways to sign in:

| Method | Type | Code |
|---|---|---|
| Email + password | local | `workers/src/api/auth.ts` |
| Magic link (email) | passwordless | `workers/src/api/auth.ts` |
| Google | client-side id-token | `workers/src/api/auth.ts` + `app/components/GoogleLoginButton.tsx` |
| **GitHub, Discord** | **server-side OAuth2 (authorization code)** | `workers/src/api/oauth.ts` + `workers/src/core/oauth-providers.ts` |

The GitHub/Discord flow is **config-driven**: a provider's button only appears once
its client id **and** secret are set as Worker secrets. With nothing configured,
the buttons simply don't render — no broken UI.

## How the redirect flow works

1. User clicks **Continue with GitHub/Discord** → browser hits
   `GET /api/auth/oauth/:provider/start`.
2. The Worker sets a short-lived CSRF `oauth_state_<provider>` cookie and 302s to
   the provider's authorize URL.
3. Provider sends the user back to
   `GET /api/auth/oauth/:provider/callback?code=…&state=…`.
4. The Worker verifies `state`, exchanges `code` for the profile, then
   **find-or-link-or-create**s the user:
   - links to an existing provider account, else
   - links to an existing user with the **same verified email**, else
   - creates a new user + starter character + trophies.
5. Sets the `session_token` cookie and redirects into the app
   (`/feed`, or `/profile/me?welcome=1` for brand-new accounts).

`GET /api/auth/oauth/providers` returns the list of currently-enabled providers;
the frontend (`app/components/OAuthButtons.tsx`) uses it to decide which buttons
to show.

## Enabling a provider

### 1. Register an OAuth app

**GitHub** — Settings → Developer settings → OAuth Apps → New OAuth App
- Homepage URL: `https://hwmnbn.me`
- Authorization callback URL: `https://hwmnbn.me/api/auth/oauth/github/callback`

**Discord** — https://discord.com/developers/applications → New Application → OAuth2
- Redirect: `https://hwmnbn.me/api/auth/oauth/discord/callback`
- Scopes used: `identify email`

> The callback URL must match **exactly**, including scheme and path.

### 2. Set the Worker secrets

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
```

(Client ids aren't sensitive, but storing them as secrets keeps all provider
config in one place. They could also be `[vars]` in `wrangler.toml`.)

After the secrets are live, the corresponding button appears automatically.

## Adding another provider

Most OAuth2 providers (Microsoft, GitLab, Twitch, …) drop in with ~15 lines:

1. Add its `*_CLIENT_ID` / `*_CLIENT_SECRET` to `workers/src/bindings.ts`.
2. Add an `xyzExchange()` and a `case 'xyz'` in
   `workers/src/core/oauth-providers.ts`, and list it in `KNOWN_PROVIDERS`.
3. (Optional) add brand styling/icon in `app/components/OAuthButtons.tsx` —
   otherwise it renders with a neutral fallback.

No new routes or migrations are needed; `oauth_accounts` already stores any
`(provider, provider_account_id)` pair.
