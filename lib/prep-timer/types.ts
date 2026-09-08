/**
 * Preparation timer vocabulary and arithmetic.
 *
 * Deliberately free of `server-only` and of any database import: the staff
 * panel, the guest view, the service and the tests all share these, so the
 * countdown a guest sees is computed by the same code the server settles with.
 *
 * Nothing here reads a clock of its own. Every function takes `now`, which is
 * what makes it testable and what stops a browser's own clock deciding
 * anything important.
 */

import type { PrepTimerStatus } from "@/lib/db/schema";

export type { PrepTimerStatus };

/** Offered on the start control. Minutes. */
export const PREP_DURATIONS = [10, 15, 20, 30, 45] as const;

/** The only adjustments staff may make. Anything else is refused server-side. */
export const ADJUSTMENTS = [-10, -5, 5, 10] as const;
export type Adjustment = (typeof ADJUSTMENTS)[number];

/** What the server adds, once, each time a timer runs out. */
export const AUTO_EXTENSION_MINUTES = 10;

/**
 * A reduction may not take a timer below this. Staff shortening a nearly
 * finished order almost always mean "it is done" — which is Mark Ready, not a
 * countdown to zero that would immediately be extended again.
 */
export const MIN_REMAINING_AFTER_REDUCTION_MS = 60_000;

export const MINUTE_MS = 60_000;

/** Statuses whose countdown is moving. */
export const RUNNING_STATUSES = ["preparing", "delayed"] as const;
/** Statuses that will never count down again. */
export const FINISHED_STATUSES = ["ready", "completed", "cancelled"] as const;

export function isRunning(status: PrepTimerStatus): boolean {
  return (RUNNING_STATUSES as readonly string[]).includes(status);
}

export function isFinished(status: PrepTimerStatus): boolean {
  return (FINISHED_STATUSES as readonly string[]).includes(status);
}

/** A timer that still occupies its booking, so no second one may be started. */
export function isActive(status: PrepTimerStatus): boolean {
  return isRunning(status) || status === "paused";
}

/**
 * What both views receive.
 *
 * `serverNow` travels with it so the client can measure its own clock against
 * the server's and display the server's answer rather than its own. A guest
 * whose laptop is twenty minutes fast still sees the correct countdown.
 */
export type PrepTimerView = {
  id: string;
  status: PrepTimerStatus;
  /** ISO. Null while paused, and once the timer has finished. */
  endsAt: string | null;
  /** Milliseconds left at `serverNow`, already floored at zero. */
  remainingMs: number;
  originalDurationMinutes: number;
  extensionCount: number;
  autoExtensionCount: number;
  startedAt: string;
  readyAt: string | null;
  /** The server's clock when this was produced. */
  serverNow: string;
};

/** Milliseconds between now and `endsAt`, never negative. */
export function remainingMsFrom(endsAt: Date | string | null, now: Date | number): number {
  if (!endsAt) return 0;
  const end = endsAt instanceof Date ? endsAt.getTime() : new Date(endsAt).getTime();
  const at = typeof now === "number" ? now : now.getTime();
  return Math.max(0, end - at);
}

/**
 * Remaining time for a whole timer, whichever state it is in. A paused timer
 * holds its remainder still; a finished one has none.
 */
export function remainingMsForTimer(
  timer: { status: PrepTimerStatus; endsAt: Date | string | null; remainingMsAtPause: number | null },
  now: Date | number,
): number {
  if (timer.status === "paused") return Math.max(0, timer.remainingMsAtPause ?? 0);
  if (isFinished(timer.status)) return 0;
  return remainingMsFrom(timer.endsAt, now);
}

/** "MM:SS", and hours only once there are any. Always counts down to 00:00. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function isAdjustment(minutes: number): minutes is Adjustment {
  return (ADJUSTMENTS as readonly number[]).includes(minutes);
}

export type AdjustmentCheck =
  | { ok: true; nextRemainingMs: number }
  | { ok: false; message: string };

/**
 * Whether an adjustment may be applied, and what it would leave.
 *
 * Increases are always allowed. A reduction that would leave less than a
 * minute is refused rather than clamped, because silently doing something
 * other than what was pressed is worse than saying no.
 */
export function checkAdjustment(
  status: PrepTimerStatus,
  currentRemainingMs: number,
  minutes: number,
): AdjustmentCheck {
  if (!isAdjustment(minutes)) {
    return { ok: false, message: "That is not an adjustment this timer accepts." };
  }
  if (isFinished(status)) {
    return { ok: false, message: "This timer has finished and can no longer be changed." };
  }

  const next = currentRemainingMs + minutes * MINUTE_MS;
  if (minutes < 0 && next < MIN_REMAINING_AFTER_REDUCTION_MS) {
    return {
      ok: false,
      message: "That would leave under a minute. Mark the order ready instead.",
    };
  }
  return { ok: true, nextRemainingMs: next };
}

/**
 * How many automatic extensions a timer that expired at `endsAt` still owes,
 * and where that puts its end.
 *
 * Used to reason about a timer nobody watched. The server applies them one at
 * a time so each is recorded and each is individually race-safe; this is the
 * arithmetic those steps add up to.
 */
export function autoExtensionsOwed(endsAt: Date | string, now: Date | number): number {
  const end = endsAt instanceof Date ? endsAt.getTime() : new Date(endsAt).getTime();
  const at = typeof now === "number" ? now : now.getTime();
  if (at < end) return 0;
  const blockMs = AUTO_EXTENSION_MINUTES * MINUTE_MS;
  return Math.floor((at - end) / blockMs) + 1;
}

/** Wall-clock time the food is currently expected to be ready. */
export function estimatedReadyAt(view: PrepTimerView): Date | null {
  if (isFinished(view.status)) return null;
  return new Date(new Date(view.serverNow).getTime() + view.remainingMs);
}

/** What the guest is told. Never the internal status name. */
export function guestHeadline(status: PrepTimerStatus): string {
  switch (status) {
    case "ready":
      return "Your order is ready";
    case "delayed":
      return "A little longer";
    case "paused":
      return "Paused by the kitchen";
    case "completed":
      return "Served";
    case "cancelled":
      return "Preparation stopped";
    default:
      return "Being prepared";
  }
}
