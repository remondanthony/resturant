import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getReservationById } from "@/lib/booking/reservations";
import { pgError, UNIQUE_VIOLATION } from "@/lib/db/errors";
import {
  AUTO_EXTENSION_MINUTES,
  checkAdjustment,
  isActive,
  isFinished,
  isRunning,
  PREP_DURATIONS,
  remainingMsForTimer,
  type PrepTimerView,
} from "@/lib/prep-timer/types";
import type { PrepTimerRow, PrepTimerStatus } from "@/lib/db/schema";

/**
 * THE preparation timer service.
 *
 * Every read and every write goes through here, so there is one set of rules
 * whichever screen is asking. The browser is never the authority: it is told
 * when the timer ends and counts down to that, and any disagreement is
 * resolved by reading this again.
 *
 * The database clock — `now()` — decides everything. Not the Node process, and
 * certainly not the browser, so two servers and five browsers cannot hold five
 * different opinions about whether a timer has run out.
 */

export type TimerResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; message: string };

/** Who pressed the button. Null means the server acted on its own. */
export type Actor = { staffUserId: string } | null;

const ACTIVE: readonly PrepTimerStatus[] = ["preparing", "paused", "delayed"];
const RUNNING: readonly PrepTimerStatus[] = ["preparing", "delayed"];

/**
 * A timer nobody attended for a very long time still settles, but not without
 * limit. Ten hours of automatic extensions is already far past the point where
 * something has gone wrong in the kitchen, not in the software.
 */
const MAX_AUTO_EXTENSIONS_PER_SETTLE = 60;

function fail(reason: string, message: string) {
  return { ok: false as const, reason, message };
}

/* ──────────────────────────────────────────────────────────── reading ───── */

/** The booking's live timer, if it has one. Finished timers are not live. */
async function readActiveRow(reservationId: string): Promise<PrepTimerRow | null> {
  const rows = await getDb()
    .select()
    .from(schema.prepTimers)
    .where(
      and(
        eq(schema.prepTimers.reservationId, reservationId),
        inArray(schema.prepTimers.status, [...ACTIVE]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** The most recent timer of any state, so a finished one still shows. */
async function readLatestRow(reservationId: string): Promise<PrepTimerRow | null> {
  const rows = await getDb()
    .select()
    .from(schema.prepTimers)
    .where(eq(schema.prepTimers.reservationId, reservationId))
    .orderBy(desc(schema.prepTimers.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The database's clock.
 *
 * Every view is stamped with this rather than with the Node process's own
 * time, so a server whose clock has drifted still reports remaining time that
 * agrees with the `now()` the timer is actually judged against.
 *
 * The two drivers disagree about what `execute` returns — node-postgres gives
 * a QueryResult, Neon's HTTP driver gives the rows — so both shapes are read.
 */
async function databaseNow(): Promise<Date> {
  try {
    const result = (await getDb().execute(sql`select now() as now`)) as unknown;
    const rows = Array.isArray(result)
      ? (result as { now: unknown }[])
      : ((result as { rows?: { now: unknown }[] }).rows ?? []);
    const value = rows[0]?.now;
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
  } catch (error) {
    console.error("[prep-timer] could not read the database clock", error);
  }
  return new Date();
}

function toView(row: PrepTimerRow, now: Date): PrepTimerView {
  return {
    id: row.id,
    status: row.status,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    remainingMs: remainingMsForTimer(row, now),
    originalDurationMinutes: row.originalDurationMinutes,
    extensionCount: row.extensionCount,
    autoExtensionCount: row.autoExtensionCount,
    startedAt: row.startedAt.toISOString(),
    readyAt: row.readyAt ? row.readyAt.toISOString() : null,
    serverNow: now.toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────── the audit ──── */

async function record(
  timerId: string,
  event: schema.PrepTimerEventType,
  actor: Actor,
  deltaMinutes?: number,
) {
  try {
    await getDb().insert(schema.prepTimerEvents).values({
      timerId,
      event,
      deltaMinutes: deltaMinutes ?? null,
      staffUserId: actor?.staffUserId ?? null,
    });
  } catch (error) {
    // History is worth having but never worth failing a kitchen action for.
    console.error("[prep-timer] could not record event", error);
  }
}

/* ───────────────────────────────────────────── the automatic extension ──── */

/**
 * Adds one automatic ten minutes, if and only if this timer has actually run
 * out and nobody has already added it.
 *
 * This is the whole duplicate-prevention mechanism, and it is one statement.
 * The `ends_at <= now()` in the WHERE clause is the guard: the first caller to
 * commit moves `ends_at` into the future, so every other caller — another
 * staff dashboard, the guest's phone, a second server — finds the condition no
 * longer true and updates nothing. Postgres serialises the row update, so
 * there is no window between the two.
 *
 * Returns the updated row, or null when there was nothing to do.
 */
async function tryAutoExtend(timerId: string): Promise<PrepTimerRow | null> {
  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      endsAt: sql`${schema.prepTimers.endsAt} + (${AUTO_EXTENSION_MINUTES} * interval '1 minute')`,
      status: "delayed",
      autoExtensionCount: sql`${schema.prepTimers.autoExtensionCount} + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(schema.prepTimers.id, timerId),
        inArray(schema.prepTimers.status, [...RUNNING]),
        sql`${schema.prepTimers.endsAt} is not null`,
        sql`${schema.prepTimers.endsAt} <= now()`,
      ),
    )
    .returning();

  return rows[0] ?? null;
}

/**
 * Brings a timer up to date before anyone looks at it.
 *
 * Called on every read, which is what makes a timer that expired while every
 * browser was closed correct the moment someone opens one. A long gap needs
 * more than one extension; each is applied by its own guarded statement, so
 * each is separately safe against a racing caller and each is recorded.
 */
async function settle(row: PrepTimerRow): Promise<PrepTimerRow> {
  if (!isRunning(row.status)) return row;

  let current = row;
  for (let i = 0; i < MAX_AUTO_EXTENSIONS_PER_SETTLE; i += 1) {
    const extended = await tryAutoExtend(current.id);
    if (!extended) break;
    current = extended;
    await record(current.id, "auto_extended", null, AUTO_EXTENSION_MINUTES);
  }
  return current;
}

/* ─────────────────────────────────────────────────────────── public read ── */

/**
 * The booking's timer as both screens see it, already settled.
 * Returns null when this booking has never had one.
 */
export async function getTimerForReservation(
  reservationId: string,
): Promise<PrepTimerView | null> {
  const active = await readActiveRow(reservationId);
  const row = active ?? (await readLatestRow(reservationId));
  if (!row) return null;

  const settled = await settle(row);
  return toView(settled, await databaseNow());
}

export type TimerHistoryEntry = {
  event: schema.PrepTimerEventType;
  deltaMinutes: number | null;
  staffName: string | null;
  at: string;
};

/** The timer's history, for the staff detail page. Never sent to a guest. */
export async function getTimerHistory(timerId: string): Promise<TimerHistoryEntry[]> {
  const rows = await getDb()
    .select({
      event: schema.prepTimerEvents.event,
      deltaMinutes: schema.prepTimerEvents.deltaMinutes,
      staffName: schema.staffUsers.name,
      at: schema.prepTimerEvents.createdAt,
    })
    .from(schema.prepTimerEvents)
    .leftJoin(schema.staffUsers, eq(schema.prepTimerEvents.staffUserId, schema.staffUsers.id))
    .where(eq(schema.prepTimerEvents.timerId, timerId))
    .orderBy(desc(schema.prepTimerEvents.createdAt))
    .limit(50);

  return rows.map((r) => ({
    event: r.event,
    deltaMinutes: r.deltaMinutes,
    staffName: r.staffName,
    at: r.at.toISOString(),
  }));
}

/* ──────────────────────────────────────────────────────────── starting ──── */

/**
 * Starts a timer for a booking that has a table.
 *
 * The table requirement is the integration point the kitchen actually cares
 * about: food is prepared for somewhere to send it. Everything else is a
 * state check — a cancelled or finished booking is not cooking.
 */
export async function startTimer(
  reservationId: string,
  minutes: number,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  if (!(PREP_DURATIONS as readonly number[]).includes(minutes)) {
    return fail("duration", "That is not one of the preparation times.");
  }

  const reservation = await getReservationById(reservationId);
  if (!reservation) return fail("not-found", "That reservation no longer exists.");
  if (!reservation.tableId) {
    return fail("no-table", "Assign a table before starting preparation.");
  }
  if (!["confirmed", "seated"].includes(reservation.status)) {
    return fail(
      "reservation-state",
      `This booking is ${reservation.status.replace("_", " ")}. Preparation can only start on a confirmed or seated booking.`,
    );
  }

  try {
    const rows = await getDb()
      .insert(schema.prepTimers)
      .values({
        reservationId,
        status: "preparing",
        originalDurationMinutes: minutes,
        startedAt: sql`now()`,
        endsAt: sql`now() + (${minutes} * interval '1 minute')`,
      })
      .returning();

    const row = rows[0];
    await record(row.id, "started", actor, minutes);
    return { ok: true, data: toView(row, await databaseNow()) };
  } catch (error) {
    // The partial unique index refuses a second live timer for the booking,
    // so two staff pressing Start together cannot both create one.
    if (pgError(error).code === UNIQUE_VIOLATION) {
      return fail("already-running", "A preparation timer is already running for this booking.");
    }
    console.error("[prep-timer] start failed", error);
    return fail("unknown", "We couldn't start the timer. Please try again.");
  }
}

/* ─────────────────────────────────────────────────────────── adjusting ──── */

/**
 * Moves the end of a running timer, or the stored remainder of a paused one.
 *
 * The amount is checked against the allowed set here rather than trusted from
 * the caller, and a reduction that would leave under a minute is refused.
 */
export async function adjustTimer(
  reservationId: string,
  minutes: number,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  const existing = await readActiveRow(reservationId);
  if (!existing) return fail("not-found", "There is no running timer for this booking.");

  const settled = await settle(existing);
  const now = await databaseNow();
  const check = checkAdjustment(settled.status, remainingMsForTimer(settled, now), minutes);
  if (!check.ok) return fail("invalid-adjustment", check.message);

  const paused = settled.status === "paused";
  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      ...(paused
        ? { remainingMsAtPause: check.nextRemainingMs }
        : {
            endsAt: sql`${schema.prepTimers.endsAt} + (${minutes} * interval '1 minute')`,
          }),
      extensionCount: sql`${schema.prepTimers.extensionCount} + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(schema.prepTimers.id, settled.id),
        // Re-checked in the statement so a timer marked ready a moment ago
        // cannot be adjusted by a click that was already in flight.
        inArray(schema.prepTimers.status, [...ACTIVE]),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) return fail("state", "That timer changed while you were adjusting it.");

  await record(row.id, minutes > 0 ? "extended" : "reduced", actor, minutes);
  return { ok: true, data: toView(row, await databaseNow()) };
}

/* ────────────────────────────────────────────────────── pause and resume ── */

export async function pauseTimer(
  reservationId: string,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  const existing = await readActiveRow(reservationId);
  if (!existing) return fail("not-found", "There is no running timer for this booking.");
  if (existing.status === "paused") {
    return fail("already-paused", "That timer is already paused.");
  }

  const settled = await settle(existing);

  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      status: "paused",
      // The remainder is computed by the database from its own clock, so a
      // pause cannot gain or lose time to a browser's idea of the hour.
      remainingMsAtPause: sql<number>`greatest(0, floor(extract(epoch from (${schema.prepTimers.endsAt} - now())) * 1000))::int`,
      endsAt: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(schema.prepTimers.id, settled.id), inArray(schema.prepTimers.status, [...RUNNING])),
    )
    .returning();

  const row = rows[0];
  if (!row) return fail("state", "That timer is no longer running.");

  await record(row.id, "paused", actor);
  return { ok: true, data: toView(row, await databaseNow()) };
}

export async function resumeTimer(
  reservationId: string,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  const existing = await readActiveRow(reservationId);
  if (!existing) return fail("not-found", "There is no timer for this booking.");
  if (existing.status !== "paused") return fail("not-paused", "That timer is not paused.");

  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      // A timer that had already overrun goes back to being delayed, so the
      // guest is not told everything is on schedule when it is not.
      status: sql`case when ${schema.prepTimers.autoExtensionCount} > 0 then 'delayed'::prep_timer_status else 'preparing'::prep_timer_status end`,
      endsAt: sql`now() + (coalesce(${schema.prepTimers.remainingMsAtPause}, 0) * interval '1 millisecond')`,
      remainingMsAtPause: null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(schema.prepTimers.id, existing.id), eq(schema.prepTimers.status, "paused")))
    .returning();

  const row = rows[0];
  if (!row) return fail("state", "That timer changed while you were resuming it.");

  await record(row.id, "resumed", actor);
  return { ok: true, data: toView(row, await databaseNow()) };
}

/* ────────────────────────────────────────────────────────── finishing ───── */

/**
 * Stops the timer because the food is up.
 *
 * Once a timer is ready it is out of the running statuses, which is exactly
 * what stops the automatic extension touching it again — the guard in
 * `tryAutoExtend` only matches `preparing` and `delayed`.
 */
export async function markReady(
  reservationId: string,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  const existing = await readActiveRow(reservationId);
  if (!existing) return fail("not-found", "There is no running timer for this booking.");

  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      status: "ready",
      readyAt: sql`now()`,
      endsAt: null,
      remainingMsAtPause: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(schema.prepTimers.id, existing.id), inArray(schema.prepTimers.status, [...ACTIVE])),
    )
    .returning();

  const row = rows[0];
  if (!row) return fail("state", "That timer has already finished.");

  await record(row.id, "ready", actor);
  return { ok: true, data: toView(row, await databaseNow()) };
}

/** Preparation is over and the plate has gone out. Frees the booking for another. */
export async function completeTimer(
  reservationId: string,
  actor: Actor,
): Promise<TimerResult<PrepTimerView>> {
  const rows = await getDb()
    .update(schema.prepTimers)
    .set({
      status: "completed",
      completedAt: sql`now()`,
      endsAt: null,
      remainingMsAtPause: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(schema.prepTimers.reservationId, reservationId),
        inArray(schema.prepTimers.status, [...ACTIVE, "ready"]),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) return fail("not-found", "There is no timer to complete for this booking.");

  await record(row.id, "completed", actor);
  return { ok: true, data: toView(row, await databaseNow()) };
}

/**
 * Stops a timer because the booking itself has gone away.
 *
 * Safe to call when there is no timer — a cancelled booking that never ordered
 * is not an error.
 */
export async function cancelTimerForReservation(
  reservationId: string,
  actor: Actor,
): Promise<void> {
  try {
    const rows = await getDb()
      .update(schema.prepTimers)
      .set({
        status: "cancelled",
        cancelledAt: sql`now()`,
        endsAt: null,
        remainingMsAtPause: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(schema.prepTimers.reservationId, reservationId),
          inArray(schema.prepTimers.status, [...ACTIVE]),
        ),
      )
      .returning();

    if (rows[0]) await record(rows[0].id, "cancelled", actor);
  } catch (error) {
    // Cancelling the booking is what matters; the timer is a consequence.
    console.error("[prep-timer] could not cancel timer", error);
  }
}

export { isActive, isFinished, isRunning };
