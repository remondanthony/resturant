import "server-only";

/**
 * Throttles repeated sign-in attempts.
 *
 * Deliberately small: a fixed-window counter held in memory, keyed by client
 * address and by the email being tried. It stops an unattended password guess
 * loop, which is the realistic threat for a single-restaurant dashboard.
 *
 * Limitation worth knowing: the counter lives in the process, so it resets on
 * deploy and is not shared between instances. If TAVOLO is ever run on more
 * than one instance, move this to the database or a shared cache — the call
 * sites will not need to change.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Attempts allowed per key inside the window. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
/** Stops the map growing without bound on a long-running process. */
const MAX_KEYS = 5_000;

function prune(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  if (windows.size > MAX_KEYS) windows.clear();
}

export type RateLimitResult = {
  allowed: boolean;
  /** Whole seconds until the caller may try again. */
  retryAfterSeconds: number;
};

/** Records an attempt against every key and reports whether to proceed. */
export function checkRateLimit(keys: readonly string[]): RateLimitResult {
  const now = Date.now();
  prune(now);

  let blockedUntil = 0;

  for (const key of keys) {
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
      continue;
    }

    existing.count += 1;
    if (existing.count > MAX_ATTEMPTS) {
      blockedUntil = Math.max(blockedUntil, existing.resetAt);
    }
  }

  if (blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears the counters for a key set — called after a successful sign-in. */
export function clearRateLimit(keys: readonly string[]) {
  for (const key of keys) windows.delete(key);
}

/**
 * Best-effort client address. Behind a proxy this is the left-most entry of
 * `x-forwarded-for`; falls back to a constant so the limiter still applies
 * globally rather than failing open per-request.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown-client";
}
