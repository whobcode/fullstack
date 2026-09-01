export type Bindings = {
  // D1 Databases
  DB: D1Database;
  HUES_DB: D1Database; // 8hues database for user sync

  // R2 Buckets
  MEDIA: R2Bucket;

  // KV Namespaces
  APP_CONFIG: KVNamespace;

  // Queues
  JOBS_QUEUE: Queue;

  // Durable Objects
  BATTLE_ROOM: DurableObjectNamespace;
  GAME_PRESENCE_ROOM: DurableObjectNamespace;

  // Workers AI
  AI: Ai;

  // Environment Variables
  XP_RATE_PER_HOUR: string;
  DAILY_XP_CAP: string;
  WIN_XP_AWARD: string;
  MITIGATION_FACTOR: string;
  CLASS_MODS: string;

  // Secrets
  GOOGLE_CLIENT_ID?: string;

  // Social OAuth (authorization-code flow) — server-side client id + secret per
  // provider. A provider's button only appears once both its id and secret are set.
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;

  // Square Payment Integration
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_APPLICATION_ID?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_ENVIRONMENT?: 'sandbox' | 'production';

  // Email (Resend)
  RESEND_API_KEY?: string;
  APP_URL?: string;

  // Wit.ai Voice Integration
  WIT_AI_TOKEN?: string;
};
