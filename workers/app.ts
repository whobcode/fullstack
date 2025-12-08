import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import api from "./src/api";
import { handleScheduled } from "./src/core/cron";
import { BattleRoom, GamePresenceRoom } from "./src/core/durable-objects";
import type { Bindings } from "./src/bindings";

const app = new Hono<{ Bindings: Bindings }>();

// Mount the API routes
app.route("/api", api);

// Serve the React application for all other requests
app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};

// Export Durable Objects for Wrangler bindings
export { BattleRoom, GamePresenceRoom };
