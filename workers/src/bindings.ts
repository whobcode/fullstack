import { D1Database, R2Bucket, KVNamespace, Queue, DurableObjectNamespace } from '@cloudflare/workers-types';

export type Bindings = {
  // D1 Database
  DB: D1Database;

  // R2 Buckets
  // MEDIA: R2Bucket;

  // KV Namespaces
  APP_CONFIG: KVNamespace;

  // Queues
  JOBS_QUEUE: Queue;

  // Durable Objects
  BATTLE_ROOM: DurableObjectNamespace;
  GAME_PRESENCE_ROOM: DurableObjectNamespace;

  // Environment Variables
  XP_RATE_PER_HOUR: string;
  DAILY_XP_CAP: string;
  WIN_XP_AWARD: string;
  MITIGATION_FACTOR: string;
  CLASS_MODS: string;

  // Secrets
  // Add any secrets here, e.g., JWT_SECRET: string;
};
