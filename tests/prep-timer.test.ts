import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ADJUSTMENTS,
  AUTO_EXTENSION_MINUTES,
  autoExtensionsOwed,
  checkAdjustment,
  estimatedReadyAt,
  formatRemaining,
  guestHeadline,
  isActive,
  isFinished,
  isRunning,
  MINUTE_MS,
  PREP_DURATIONS,
  remainingMsForTimer,
  remainingMsFrom,
  type PrepTimerView,
} from "../lib/prep-timer/types";

/**
 * Preparation timer rules.
 *
 * These cover the arithmetic and the state machine, which are pure and so can
 * be proven without a database. The guarantees that only a database can give —
 * that a single expiry produces exactly one automatic extension however many
 * clients notice it at once — are in tests/prep-timer-integration.mts.
 */

const NOW = Date.parse("2026-03-01T19:00:00.000Z");

function view(over: Partial<PrepTimerView> = {}): PrepTimerView {
  return {
    id: "t1",
    status: "preparing",
    endsAt: new Date(NOW + 20 * MINUTE_MS).toISOString(),
    remainingMs: 20 * MINUTE_MS,
    originalDurationMinutes: 20,
    extensionCount: 0,
    autoExtensionCount: 0,
    startedAt: new Date(NOW).toISOString(),
    readyAt: null,
    serverNow: new Date(NOW).toISOString(),
    ...over,
  };
}

/* ───────────────────────────────────────────────────── counting down ────── */

test("a 20 minute timer starts with 20 minutes on it", () => {
  const endsAt = new Date(NOW + 20 * MINUTE_MS);
  assert.equal(remainingMsFrom(endsAt, NOW), 20 * MINUTE_MS);
  assert.equal(formatRemaining(remainingMsFrom(endsAt, NOW)), "20:00");
});

test("remaining time is measured against the clock, not counted down", () => {
  // The same end time read at three moments gives three answers. Nothing is
  // accumulated, which is why a slept or refreshed browser is never wrong.
  const endsAt = new Date(NOW + 20 * MINUTE_MS);
  assert.equal(formatRemaining(remainingMsFrom(endsAt, NOW)), "20:00");
  assert.equal(formatRemaining(remainingMsFrom(endsAt, NOW + 28_000)), "19:32");
  assert.equal(formatRemaining(remainingMsFrom(endsAt, NOW + 19.5 * MINUTE_MS)), "00:30");
});

test("re-reading the same end time gives the same answer — a refresh resets nothing", () => {
  const endsAt = new Date(NOW + 20 * MINUTE_MS);
  const atRefresh = NOW + 7 * MINUTE_MS;
  const first = remainingMsFrom(endsAt, atRefresh);
  const second = remainingMsFrom(endsAt, atRefresh);
  assert.equal(first, second);
  assert.equal(formatRemaining(first), "13:00");
});

test("remaining time never goes negative", () => {
  const endsAt = new Date(NOW);
  assert.equal(remainingMsFrom(endsAt, NOW + 5 * MINUTE_MS), 0);
  assert.equal(formatRemaining(-5_000), "00:00");
});

test("a paused timer holds its remainder still", () => {
  const paused = {
    status: "paused" as const,
    endsAt: null,
    remainingMsAtPause: 8 * MINUTE_MS,
  };
  // Time passing does not move a paused timer.
  assert.equal(remainingMsForTimer(paused, NOW), 8 * MINUTE_MS);
  assert.equal(remainingMsForTimer(paused, NOW + 30 * MINUTE_MS), 8 * MINUTE_MS);
});

test("a finished timer has no remaining time", () => {
  for (const status of ["ready", "completed", "cancelled"] as const) {
    const row = { status, endsAt: new Date(NOW + 10 * MINUTE_MS), remainingMsAtPause: null };
    assert.equal(remainingMsForTimer(row, NOW), 0, `${status} should have no time left`);
  }
});

test("the clock is formatted for a kitchen, hours only when there are any", () => {
  assert.equal(formatRemaining(0), "00:00");
  assert.equal(formatRemaining(9_000), "00:09");
  assert.equal(formatRemaining(90_000), "01:30");
  assert.equal(formatRemaining(20 * MINUTE_MS), "20:00");
  assert.equal(formatRemaining(65 * MINUTE_MS), "1:05:00");
});

/* ─────────────────────────────────────────────── manual adjustments ─────── */

test("staff may add five, add ten, take five and take ten — and nothing else", () => {
  assert.deepEqual([...ADJUSTMENTS].sort((a, b) => a - b), [-10, -5, 5, 10]);

  const twenty = 20 * MINUTE_MS;
  assert.deepEqual(checkAdjustment("preparing", twenty, 5), {
    ok: true,
    nextRemainingMs: 25 * MINUTE_MS,
  });
  assert.deepEqual(checkAdjustment("preparing", twenty, 10), {
    ok: true,
    nextRemainingMs: 30 * MINUTE_MS,
  });
  assert.deepEqual(checkAdjustment("preparing", twenty, -5), {
    ok: true,
    nextRemainingMs: 15 * MINUTE_MS,
  });
  assert.deepEqual(checkAdjustment("preparing", twenty, -10), {
    ok: true,
    nextRemainingMs: 10 * MINUTE_MS,
  });
});

test("an amount the buttons do not offer is refused", () => {
  for (const bad of [1, 7, 15, -1, -7, 0, 60, 3.5]) {
    const result = checkAdjustment("preparing", 20 * MINUTE_MS, bad);
    assert.equal(result.ok, false, `${bad} should be refused`);
  }
});

test("a reduction that would leave under a minute is refused, not clamped", () => {
  // Silently doing something other than what was pressed is worse than a no.
  const result = checkAdjustment("preparing", 4 * MINUTE_MS, -5);
  assert.equal(result.ok, false);
  assert.match((result as { message: string }).message, /under a minute|ready/i);

  // Exactly one minute left is still allowed.
  assert.equal(checkAdjustment("preparing", 6 * MINUTE_MS, -5).ok, true);
});

test("a delayed timer can still be adjusted; a finished one cannot", () => {
  assert.equal(checkAdjustment("delayed", 5 * MINUTE_MS, 10).ok, true);
  assert.equal(checkAdjustment("paused", 5 * MINUTE_MS, 10).ok, true);
  for (const status of ["ready", "completed", "cancelled"] as const) {
    const result = checkAdjustment(status, 5 * MINUTE_MS, 10);
    assert.equal(result.ok, false, `${status} must refuse adjustment`);
  }
});

/* ───────────────────────────────────────────── the automatic extension ──── */

test("running out owes exactly one automatic extension", () => {
  const endsAt = new Date(NOW);
  assert.equal(autoExtensionsOwed(endsAt, NOW - 1_000), 0, "not yet expired");
  assert.equal(autoExtensionsOwed(endsAt, NOW), 1, "expired this instant");
  assert.equal(autoExtensionsOwed(endsAt, NOW + 30_000), 1);
  assert.equal(autoExtensionsOwed(endsAt, NOW + 9 * MINUTE_MS), 1);
});

test("the automatic extension is ten minutes, so 00:00 becomes 10:00", () => {
  assert.equal(AUTO_EXTENSION_MINUTES, 10);
  const expired = new Date(NOW);
  const owed = autoExtensionsOwed(expired, NOW);
  const newEnd = new Date(expired.getTime() + owed * AUTO_EXTENSION_MINUTES * MINUTE_MS);
  assert.equal(formatRemaining(remainingMsFrom(newEnd, NOW)), "10:00");
});

test("a timer nobody watched for an hour owes more than one extension", () => {
  // Each is applied separately by the server, so each is recorded and each is
  // individually safe against a racing caller.
  const endsAt = new Date(NOW);
  assert.equal(autoExtensionsOwed(endsAt, NOW + 10 * MINUTE_MS), 2);
  assert.equal(autoExtensionsOwed(endsAt, NOW + 25 * MINUTE_MS), 3);
  assert.equal(autoExtensionsOwed(endsAt, NOW + 60 * MINUTE_MS), 7);
});

/* ──────────────────────────────────────────────────── state machine ─────── */

test("only preparing and delayed are counting down", () => {
  assert.equal(isRunning("preparing"), true);
  assert.equal(isRunning("delayed"), true);
  for (const status of ["paused", "ready", "completed", "cancelled"] as const) {
    assert.equal(isRunning(status), false, `${status} must not be running`);
  }
});

test("ready, completed and cancelled are finished — nothing extends them again", () => {
  for (const status of ["ready", "completed", "cancelled"] as const) {
    assert.equal(isFinished(status), true);
    assert.equal(isRunning(status), false);
    assert.equal(isActive(status), false);
  }
  for (const status of ["preparing", "delayed", "paused"] as const) {
    assert.equal(isFinished(status), false);
    assert.equal(isActive(status), true, `${status} still occupies the booking`);
  }
});

test("the estimated ready time is now plus what is left", () => {
  const at = estimatedReadyAt(view({ remainingMs: 12 * MINUTE_MS }));
  assert.ok(at);
  assert.equal(at.getTime(), NOW + 12 * MINUTE_MS);
  // A finished order has no estimate to give.
  assert.equal(estimatedReadyAt(view({ status: "ready", remainingMs: 0 })), null);
});

test("guests are told what is happening, never the internal status name", () => {
  assert.equal(guestHeadline("preparing"), "Being prepared");
  assert.equal(guestHeadline("delayed"), "A little longer");
  assert.equal(guestHeadline("ready"), "Your order is ready");

  const statuses = ["preparing", "delayed", "paused", "ready", "completed", "cancelled"] as const;
  for (const status of statuses) {
    const headline = guestHeadline(status);
    assert.ok(headline.length > 0, `${status} needs a headline`);
    // Never the raw enum member, and never an identifier-looking string.
    assert.notEqual(headline.toLowerCase(), status);
    assert.doesNotMatch(headline, /_/, `${status} headline must read as English`);
  }
});

test("the durations offered are the ones the brief asked for", () => {
  assert.deepEqual([...PREP_DURATIONS], [10, 15, 20, 30, 45]);
});

/* ───────────────────────────────────────────────── the security boundary ── */

const publicActions = readFileSync(new URL("../lib/booking/actions.ts", import.meta.url), "utf8");
const adminActions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");

test("a guest can read a timer and has no way to change one", () => {
  // The public module is what a browser can reach without a staff session.
  assert.match(publicActions, /export async function getPrepStatusForGuest/);

  for (const mutator of [
    "startPrepTimer",
    "adjustPrepTimer",
    "pausePrepTimer",
    "resumePrepTimer",
    "markPrepReady",
    "completePrepTimer",
    "startTimer",
    "adjustTimer",
    "markReady",
  ]) {
    assert.doesNotMatch(
      publicActions,
      new RegExp(`export\\s+(async\\s+)?function\\s+${mutator}\\b`),
      `the public actions module must never export ${mutator}`,
    );
  }
});

test("the guest read verifies the booking rather than trusting an id", () => {
  const body = publicActions.slice(publicActions.indexOf("getPrepStatusForGuest"));
  assert.match(
    body,
    /findReservationForGuest\(\s*code\s*,\s*contact\s*\)/,
    "the code and contact pair must be re-checked server-side",
  );
});

test("every staff timer control is behind the authorization guard", () => {
  const controls = [
    "startPrepTimer",
    "adjustPrepTimer",
    "pausePrepTimer",
    "resumePrepTimer",
    "markPrepReady",
    "completePrepTimer",
  ];

  for (const control of controls) {
    const start = adminActions.indexOf(`export async function ${control}`);
    assert.notEqual(start, -1, `${control} should exist`);
    // Read to the start of the next export, so each body is checked alone.
    const rest = adminActions.slice(start + control.length);
    const nextExport = rest.indexOf("\nexport ");
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);

    assert.match(body, /guarded\(/, `${control} must go through guarded()`);
    assert.match(body, /requireStaff\(\)/, `${control} must require a staff session`);
  }

  // The read is guarded too — timers are not public data.
  const loadStart = adminActions.indexOf("export async function loadPrepTimer");
  assert.notEqual(loadStart, -1);
  assert.match(adminActions.slice(loadStart, loadStart + 260), /requireStaff\(\)/);
});

test("the browser never supplies a time, only which booking and which button", () => {
  // Each control takes a reservation id and, at most, a fixed adjustment. No
  // endsAt, no remaining, no timer id — those are the server's to decide.
  assert.match(
    adminActions,
    /export async function adjustPrepTimer\(\s*reservationId: string,\s*minutes: number,\s*\)/,
  );
  assert.doesNotMatch(adminActions, /function \w*PrepTimer\w*\([^)]*endsAt/);
  assert.doesNotMatch(adminActions, /function \w*PrepTimer\w*\([^)]*remainingMs/);
});
