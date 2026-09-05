import "server-only";

import { Client } from "pg";
import { CHANGE_CHANNEL, isChangePayload, type ChangePayload } from "@/lib/realtime/events";

/**
 * A single Postgres LISTEN session, shared by every connected dashboard.
 *
 * One long-lived connection serves all staff on this instance; each SSE
 * request is just another in-process subscriber. The session connects when the
 * first dashboard opens and closes shortly after the last one leaves, so an
 * idle server holds no database connection.
 *
 * Requires a session-scoped connection. Neon's pooled endpoint runs PgBouncer
 * in transaction mode, which does not carry LISTEN — set DATABASE_URL_UNPOOLED
 * to the direct connection string there. Locally the two are the same.
 *
 * Also requires a persistent Node process. On a platform that freezes between
 * requests the listener cannot stay resident; see README.
 */

type Subscriber = (payload: ChangePayload) => void;

type ListenerState = {
  client: Client | null;
  connecting: Promise<void> | null;
  subscribers: Set<Subscriber>;
  retries: number;
  shutdownTimer: NodeJS.Timeout | null;
  /** Flips false when the connection drops, true once LISTEN is re-established. */
  connected: boolean;
};

/** Survives module re-evaluation during development hot reloads. */
const globalRef = globalThis as typeof globalThis & { __tavoloListener?: ListenerState };

const state: ListenerState = (globalRef.__tavoloListener ??= {
  client: null,
  connecting: null,
  subscribers: new Set(),
  retries: 0,
  shutdownTimer: null,
  connected: false,
});

/** Keeps the session up briefly after the last dashboard closes. */
const IDLE_SHUTDOWN_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;

function listenerUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

function broadcast(payload: ChangePayload) {
  for (const subscriber of state.subscribers) {
    try {
      subscriber(payload);
    } catch (error) {
      // One bad subscriber must not stop the others receiving the event.
      console.error("[realtime] subscriber failed", error);
    }
  }
}

async function connect(): Promise<void> {
  if (state.client) return;

  const client = new Client({ connectionString: listenerUrl() });

  client.on("notification", (message) => {
    if (message.channel !== CHANGE_CHANNEL || !message.payload) return;
    try {
      const parsed: unknown = JSON.parse(message.payload);
      if (isChangePayload(parsed)) broadcast(parsed);
    } catch {
      console.error("[realtime] unparseable payload", message.payload);
    }
  });

  client.on("error", (error) => {
    console.error("[realtime] connection error", error.message);
    state.connected = false;
    void teardown().then(scheduleReconnect);
  });

  client.on("end", () => {
    state.connected = false;
    if (state.subscribers.size > 0) scheduleReconnect();
  });

  await client.connect();
  await client.query(`LISTEN ${CHANGE_CHANNEL}`);

  state.client = client;
  state.connected = true;
  state.retries = 0;
}

async function teardown() {
  const client = state.client;
  state.client = null;
  state.connected = false;
  if (!client) return;
  try {
    await client.end();
  } catch {
    // Already gone — nothing to release.
  }
}

function scheduleReconnect() {
  if (state.subscribers.size === 0) return;

  const delay = Math.min(1000 * 2 ** state.retries, MAX_BACKOFF_MS);
  state.retries += 1;

  setTimeout(() => {
    if (state.subscribers.size === 0) return;
    void ensureListening().catch((error) => {
      console.error("[realtime] reconnect failed", error);
      scheduleReconnect();
    });
  }, delay);
}

async function ensureListening(): Promise<void> {
  if (state.client && state.connected) return;
  state.connecting ??= connect().finally(() => {
    state.connecting = null;
  });
  return state.connecting;
}

/**
 * Registers a listener for database changes. Returns an unsubscribe function
 * the caller must invoke — the SSE route does so when the request aborts.
 */
export async function subscribeToChanges(subscriber: Subscriber): Promise<() => void> {
  state.subscribers.add(subscriber);

  if (state.shutdownTimer) {
    clearTimeout(state.shutdownTimer);
    state.shutdownTimer = null;
  }

  try {
    await ensureListening();
  } catch (error) {
    // A dashboard with no live channel still works; it just falls back to
    // resyncing on reconnect rather than being pushed to.
    console.error("[realtime] could not start listening", error);
    scheduleReconnect();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.subscribers.delete(subscriber);

    if (state.subscribers.size === 0 && !state.shutdownTimer) {
      state.shutdownTimer = setTimeout(() => {
        state.shutdownTimer = null;
        if (state.subscribers.size === 0) void teardown();
      }, IDLE_SHUTDOWN_MS);
    }
  };
}

export function listenerIsConnected(): boolean {
  return state.connected;
}
