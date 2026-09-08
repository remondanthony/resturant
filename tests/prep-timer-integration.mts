/**
 * Preparation timer database checks. Run against a real Postgres:
 *
 *   npm run test:timer
 *
 * These cover what no unit test can: that a single expiry produces exactly one
 * automatic extension however many staff dashboards and guest phones notice it
 * at the same instant, and that the database itself refuses a second live timer
 * on one booking.
 *
 * Creates its own throwaway table and reservation, and cleans up after itself.
 */
import assert from "node:assert/strict";
import { and, desc, eq, like, sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { createDb } from "../lib/db/connect";
import { addDays, dayOfWeek, restaurantToday } from "../lib/booking/time";
import {
  adjustTimer,
  cancelTimerForReservation,
  completeTimer,
  getTimerForReservation,
  getTimerHistory,
  markReady,
  pauseTimer,
  resumeTimer,
  startTimer,
} from "../lib/prep-timer/service";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const db = createDb(url);
const MARKER = `zz-timer-${Date.now()}`;
const STAFF = null; // No staff row needed: the audit records null for the server.

let passed = 0;
let failed = 0;

async function check(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`      ${(error as Error).message.split("\n")[0]}`);
    failed += 1;
  }
}

function openDateAfter(offsetDays: number): string {
  let date = addDays(restaurantToday(), offsetDays);
  while (dayOfWeek(date) === 1) date = addDays(date, 1);
  return date;
}

/** Drops the booking's timers so each test starts from a known place. */
async function clearTimers(reservationId: string) {
  await db.delete(schema.prepTimers).where(eq(schema.prepTimers.reservationId, reservationId));
}

/** Forces a timer to have run out, without going through the service. */
async function expire(reservationId: string, secondsAgo = 1) {
  await db
    .update(schema.prepTimers)
    .set({ endsAt: sql`now() - (${secondsAgo} * interval '1 second')` })
    .where(eq(schema.prepTimers.reservationId, reservationId));
}

/** The booking's most recent timer — a booking may have finished ones behind it. */
async function rowFor(reservationId: string) {
  const rows = await db
    .select()
    .from(schema.prepTimers)
    .where(eq(schema.prepTimers.reservationId, reservationId))
    .orderBy(desc(schema.prepTimers.createdAt))
    .limit(1);
  return rows[0];
}

console.log("\nTAVOLO — preparation timer database checks\n");

const [testTable] = await db
  .insert(schema.tables)
  .values({
    name: `${MARKER}-table`,
    capacity: 4,
    type: "standard",
    location: "Test",
    isActive: true,
    sortOrder: 999,
  })
  .returning();

const [booking] = await db
  .insert(schema.reservations)
  .values({
    reservationCode: `TAV-K${String(Date.now()).slice(-4)}`,
    tableId: testTable.id,
    reservationDate: openDateAfter(200),
    startTime: "19:00",
    endTime: "21:00",
    partySize: 4,
    firstName: "Timer",
    lastName: "Guest",
    email: `${MARKER}@example.test`,
    phone: "+44 20 0000 0000",
    status: "confirmed",
  })
  .returning();

try {
  /* ── starting ─────────────────────────────────────────────────────────── */

  await check("a 20 minute timer starts and lands about 20 minutes out", async () => {
    await clearTimers(booking.id);
    const result = await startTimer(booking.id, 20, STAFF);
    assert.ok(result.ok, `start failed: ${!result.ok ? result.message : ""}`);
    assert.equal(result.data.status, "preparing");
    assert.equal(result.data.originalDurationMinutes, 20);

    const minutes = result.data.remainingMs / 60_000;
    assert.ok(minutes > 19.5 && minutes <= 20.01, `expected ~20 minutes, got ${minutes}`);
  });

  await check("re-reading does not reset it — a refresh changes nothing", async () => {
    const first = await getTimerForReservation(booking.id);
    assert.ok(first?.endsAt);
    await new Promise((r) => setTimeout(r, 1100));
    const second = await getTimerForReservation(booking.id);

    // The end is fixed; only the distance to it moves.
    assert.equal(second!.endsAt, first!.endsAt, "endsAt must not move on a plain read");
    assert.ok(
      second!.remainingMs < first!.remainingMs,
      "the countdown should have advanced, not restarted",
    );
    assert.equal(second!.id, first!.id, "it must be the same timer");
  });

  await check("a duration the buttons do not offer is refused", async () => {
    const result = await startTimer(booking.id, 17, STAFF);
    assert.equal(result.ok, false);
  });

  await check("the database refuses a second live timer on one booking", async () => {
    // Two staff pressing Start together: the partial unique index decides.
    const second = await startTimer(booking.id, 15, STAFF);
    assert.equal(second.ok, false, "a second live timer must be refused");
    assert.equal((second as { reason: string }).reason, "already-running");

    const rows = await db
      .select()
      .from(schema.prepTimers)
      .where(
        and(
          eq(schema.prepTimers.reservationId, booking.id),
          sql`${schema.prepTimers.status} in ('preparing','paused','delayed')`,
        ),
      );
    assert.equal(rows.length, 1, "exactly one live timer may exist");
  });

  /* ── manual adjustment ────────────────────────────────────────────────── */

  await check("adding five minutes moves the end five minutes later", async () => {
    const before = await rowFor(booking.id);
    const result = await adjustTimer(booking.id, 5, STAFF);
    assert.ok(result.ok);
    const after = await rowFor(booking.id);
    const moved = after.endsAt!.getTime() - before.endsAt!.getTime();
    assert.equal(moved, 5 * 60_000, `expected +5 minutes, moved ${moved}ms`);
  });

  await check("adding ten minutes moves it ten minutes later", async () => {
    const before = await rowFor(booking.id);
    await adjustTimer(booking.id, 10, STAFF);
    const after = await rowFor(booking.id);
    assert.equal(after.endsAt!.getTime() - before.endsAt!.getTime(), 10 * 60_000);
  });

  await check("removing five and removing ten move it earlier", async () => {
    const before = await rowFor(booking.id);
    await adjustTimer(booking.id, -5, STAFF);
    await adjustTimer(booking.id, -10, STAFF);
    const after = await rowFor(booking.id);
    assert.equal(after.endsAt!.getTime() - before.endsAt!.getTime(), -15 * 60_000);
  });

  await check("every manual change is counted", async () => {
    const row = await rowFor(booking.id);
    assert.equal(row.extensionCount, 4, "four adjustments were made");
  });

  await check("a reduction that would leave under a minute is refused", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 10, STAFF);
    // Take it down to about four minutes, then try to take five more.
    await adjustTimer(booking.id, -5, STAFF);
    const result = await adjustTimer(booking.id, -5, STAFF);
    assert.equal(result.ok, false, "must refuse rather than go to zero");
    assert.match((result as { message: string }).message, /minute|ready/i);
  });

  await check("an amount outside the allowed set is refused", async () => {
    for (const bad of [1, 7, 60, -1, 0]) {
      const result = await adjustTimer(booking.id, bad, STAFF);
      assert.equal(result.ok, false, `${bad} must be refused`);
    }
  });

  /* ── running out ──────────────────────────────────────────────────────── */

  await check("running out adds ten minutes and turns the timer delayed", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 20, STAFF);
    await expire(booking.id);

    const view = await getTimerForReservation(booking.id);
    assert.equal(view!.status, "delayed", "an overrun timer is delayed");
    assert.equal(view!.autoExtensionCount, 1);

    const minutes = view!.remainingMs / 60_000;
    assert.ok(minutes > 9.9 && minutes <= 10.01, `00:00 should become 10:00, got ${minutes}`);
  });

  await check("the automatic extension happens once, not once per reader", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 20, STAFF);
    await expire(booking.id);

    // Three sequential readers — a staff dashboard, then a guest, then another.
    await getTimerForReservation(booking.id);
    await getTimerForReservation(booking.id);
    const third = await getTimerForReservation(booking.id);

    assert.equal(third!.autoExtensionCount, 1, "three reads must not add three extensions");
  });

  await check(
    "eight clients noticing the same expiry at once still produce exactly ONE extension",
    async () => {
      await clearTimers(booking.id);
      await startTimer(booking.id, 20, STAFF);
      await expire(booking.id);

      // Staff dashboards, a second staff member, and guest phones, all asking
      // in the same instant. The guarded UPDATE is what has to hold.
      const readers = Array.from({ length: 8 }, () => getTimerForReservation(booking.id));
      const views = await Promise.all(readers);

      const row = await rowFor(booking.id);
      assert.equal(row.autoExtensionCount, 1, `expected exactly 1 extension, got ${row.autoExtensionCount}`);

      // And everyone agrees on the same end.
      const ends = new Set(views.map((v) => v!.endsAt));
      assert.equal(ends.size, 1, "every client must see the same end time");

      // The history records the one extension, not eight.
      const history = await getTimerHistory(row.id);
      const auto = history.filter((h) => h.event === "auto_extended");
      assert.equal(auto.length, 1, `the audit must show 1 automatic extension, saw ${auto.length}`);
      assert.equal(auto[0].staffName, null, "nobody pressed it, so no staff member is recorded");
    },
  );

  await check("a timer nobody watched for half an hour catches up in ten minute steps", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 10, STAFF);
    // Expired 25 minutes ago: three ten-minute blocks are owed.
    await expire(booking.id, 25 * 60);

    const view = await getTimerForReservation(booking.id);
    assert.equal(view!.status, "delayed");
    assert.equal(view!.autoExtensionCount, 3, "25 minutes late owes three extensions");
    assert.ok(view!.remainingMs > 0, "and it must be counting down again");

    const history = await getTimerHistory(view!.id);
    assert.equal(
      history.filter((h) => h.event === "auto_extended").length,
      3,
      "each extension is recorded separately",
    );
  });

  /* ── pause and resume ─────────────────────────────────────────────────── */

  await check("pausing keeps what was left and stops the countdown", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 20, STAFF);

    const result = await pauseTimer(booking.id, STAFF);
    assert.ok(result.ok);
    assert.equal(result.data.status, "paused");

    const first = result.data.remainingMs;
    await new Promise((r) => setTimeout(r, 1200));
    const later = await getTimerForReservation(booking.id);

    assert.equal(later!.remainingMs, first, "a paused timer must not lose time");
    assert.equal(later!.endsAt, null, "a paused timer has no end until it resumes");
  });

  await check("a paused timer is never automatically extended", async () => {
    const before = await rowFor(booking.id);
    await getTimerForReservation(booking.id);
    const after = await rowFor(booking.id);
    assert.equal(after.autoExtensionCount, before.autoExtensionCount);
    assert.equal(after.status, "paused");
  });

  await check("resuming continues from the preserved remainder", async () => {
    const paused = await rowFor(booking.id);
    const held = paused.remainingMsAtPause!;

    const result = await resumeTimer(booking.id, STAFF);
    assert.ok(result.ok);
    assert.equal(result.data.status, "preparing");
    assert.ok(
      Math.abs(result.data.remainingMs - held) < 2_000,
      `resumed with ${result.data.remainingMs}ms, expected about ${held}ms`,
    );
  });

  await check("a timer that had overrun goes back to delayed when resumed", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 10, STAFF);
    await expire(booking.id);
    await getTimerForReservation(booking.id); // settles: now delayed
    await pauseTimer(booking.id, STAFF);

    const resumed = await resumeTimer(booking.id, STAFF);
    assert.ok(resumed.ok);
    assert.equal(resumed.data.status, "delayed", "an overrun order is still late after a pause");
  });

  /* ── ready ────────────────────────────────────────────────────────────── */

  await check("marking ready stops the timer", async () => {
    await clearTimers(booking.id);
    await startTimer(booking.id, 20, STAFF);

    const result = await markReady(booking.id, STAFF);
    assert.ok(result.ok);
    assert.equal(result.data.status, "ready");
    assert.equal(result.data.remainingMs, 0);
    assert.ok(result.data.readyAt, "the moment it became ready is recorded");
  });

  await check("a ready order is NEVER given another automatic ten minutes", async () => {
    // The point of the whole feature: once the food is up, no more extensions.
    await expire(booking.id); // even if something puts an end time in the past
    for (let i = 0; i < 3; i += 1) await getTimerForReservation(booking.id);

    const row = await rowFor(booking.id);
    assert.equal(row.status, "ready", "it must stay ready");
    assert.equal(row.autoExtensionCount, 0, "a ready order must not be extended");
  });

  await check("a ready order cannot be adjusted", async () => {
    const result = await adjustTimer(booking.id, 5, STAFF);
    assert.equal(result.ok, false);
  });

  await check("completing frees the booking for another timer", async () => {
    const done = await completeTimer(booking.id, STAFF);
    assert.ok(done.ok);
    assert.equal(done.data.status, "completed");

    // The partial index only covers live timers, so a new one may start.
    const fresh = await startTimer(booking.id, 15, STAFF);
    assert.ok(fresh.ok, "a completed timer must not block the next one");
  });

  /* ── the booking going away ───────────────────────────────────────────── */

  await check("cancelling the booking stops its timer", async () => {
    await cancelTimerForReservation(booking.id, STAFF);
    const row = await rowFor(booking.id);
    assert.equal(row.status, "cancelled");
    assert.ok(row.cancelledAt);
  });

  await check("a cancelled timer is not extended either", async () => {
    await expire(booking.id);
    await getTimerForReservation(booking.id);
    const row = await rowFor(booking.id);
    assert.equal(row.status, "cancelled");
    assert.equal(row.autoExtensionCount, 0);
  });

  await check("a timer cannot start on a booking with no table", async () => {
    const [unassigned] = await db
      .insert(schema.reservations)
      .values({
        reservationCode: `TAV-N${String(Date.now()).slice(-4)}`,
        tableId: null,
        reservationDate: openDateAfter(205),
        startTime: "19:00",
        endTime: "21:00",
        partySize: 2,
        firstName: "No",
        lastName: "Table",
        email: `${MARKER}@example.test`,
        phone: "+44 20 0000 0000",
        status: "pending",
      })
      .returning();

    const result = await startTimer(unassigned.id, 20, STAFF);
    assert.equal(result.ok, false, "food is prepared for a table");
    assert.equal((result as { reason: string }).reason, "no-table");
  });

  await check("the history reads as a record of what happened", async () => {
    await clearTimers(booking.id);
    const started = await startTimer(booking.id, 20, STAFF);
    assert.ok(started.ok);
    await adjustTimer(booking.id, 5, STAFF);
    await pauseTimer(booking.id, STAFF);
    await resumeTimer(booking.id, STAFF);
    await markReady(booking.id, STAFF);

    const history = await getTimerHistory(started.data.id);
    const events = history.map((h) => h.event).reverse();
    assert.deepEqual(events, ["started", "extended", "paused", "resumed", "ready"]);

    const extended = history.find((h) => h.event === "extended");
    assert.equal(extended?.deltaMinutes, 5, "the size of the change is recorded");
  });
} finally {
  await db.delete(schema.prepTimers).where(eq(schema.prepTimers.reservationId, booking.id));
  await db.delete(schema.reservations).where(like(schema.reservations.email, `${MARKER}%`));
  await db.delete(schema.tables).where(eq(schema.tables.id, testTable.id));
  console.log("\n  cleaned up test data\n");
}

console.log(`${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
