/**
 * @module durable-objects
 * This module defines Durable Objects for managing real-time game state.
 */

/**
 * A Durable Object for managing a single battle room.
 * This can be extended to handle real-time, turn-by-turn battle updates via WebSockets.
 */
export class BattleRoom implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  /**
   * Handles incoming requests to the BattleRoom.
   * It can handle health checks and WebSocket upgrade requests.
   * @param {Request} request - The incoming HTTP request.
   * @returns {Promise<Response>} A response, which may include a WebSocket pair.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Simple health endpoint
    if (url.pathname.endsWith('/health')) {
      return Response.json({ ok: true, room: 'battle' });
    }

    // Echo websocket for future real-time battles
    const upgradeHeader = request.headers.get('Upgrade') || '';
    if (upgradeHeader.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      server.addEventListener('message', (evt) => {
        server.send(evt.data);
      });
      server.addEventListener('close', () => {
        // Placeholder cleanup hook
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    return Response.json({ message: 'BattleRoom ready' });
  }
}

/**
 * A Durable Object for managing user presence in the game.
 * This can be used to track which users are currently online and in the game.
 */
export class GamePresenceRoom implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  /**
   * Handles incoming requests to the GamePresenceRoom.
   * It can handle health checks and WebSocket upgrade requests.
   * @param {Request} request - The incoming HTTP request.
   * @returns {Promise<Response>} A response, which may include a WebSocket pair.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/health')) {
      return Response.json({ ok: true, room: 'presence' });
    }

    const upgradeHeader = request.headers.get('Upgrade') || '';
    if (upgradeHeader.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      server.send(JSON.stringify({ type: 'welcome', ts: Date.now() }));
      return new Response(null, { status: 101, webSocket: client });
    }

    return Response.json({ message: 'GamePresenceRoom ready' });
  }
}
import type { Bindings } from "../bindings";

type Env = Bindings;
