import "server-only";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  getBookingConfig,
  turnMinutes,
  type BookingConfig,
} from "@/lib/booking/config";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  overlaps,
  restaurantNowMinutes,
  restaurantToday,
  toMinutes,
  toTimeString,
} from "@/lib/booking/time";

/**
 * THE availability engine.
 *
 * Customer bookings, staff bookings, edits, the floor plan and the dashboard
 * all resolve availability through this module. There is deliberately no
 * second implementation anywhere in the codebase — see `assertSlotBookable`,
 * which every write path calls before touching the database.
 */

/**
 * Statuses that occupy a table. A seated guest is physically at it, so the
 * booking must keep blocking the slot. Cancelled and no-show release it.
 *
 * This list is mirrored by the `reservations_no_overlap` exclusion constraint
 * in the database — change one and you must change the other.
 */
export const OCCUPYING_STATUSES = ["pending", "confirmed", "seated", "completed"] as const;

export type Slot = { time: string; endTime: string };

export type TableAvailability = {
  table: schema.TableRow;
  /** Slots this table can actually take for the requested party. */
  slots: Slot[];
};

export type DayAvailability = {
  date: string;
  partySize: number;
  /** Set when the whole day is unbookable, with a reason to show the guest. */
  closed: { reason: string } | null;
  tables: TableAvailability[];
};

export type UnavailableReason =
  | "closed"
  | "outside-service"
  | "past"
  | "too-far-ahead"
  | "party-too-large"
  | "party-too-small"
  | "table-inactive"
  | "table-too-small"
  | "table-blocked"
  | "table-booked";

export class SlotUnavailableError extends Error {
  constructor(
    readonly reason: UnavailableReason,
    message: string,
  ) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

const REASON_MESSAGES: Record<UnavailableReason, string> = {
  closed: "The restaurant is closed on that date.",
  "outside-service": "That time is outside our service hours for that day.",
  past: "That date and time have already passed.",
  "too-far-ahead": "That date is beyond how far ahead we take bookings.",
  "party-too-large": "That party size is larger than we seat online.",
  "party-too-small": "Please enter at least one guest.",
  "table-inactive": "That table is not currently in service.",
  "table-too-small": "That table is too small for the party.",
  "table-blocked": "That table is unavailable at that time.",
  "table-booked": "That table is already booked at that time.",
};

/* ─────────────────────────────────────────────────────── day windows ────── */

type Window = { start: number; end: number };

/** The service window for a date, as minutes from midnight. */
export function serviceWindow(date: string, config: BookingConfig): Window | null {
  const hours = config.serviceHours[dayOfWeek(date)];
  if (!hours) return null;
  return { start: toMinutes(hours.open), end: toMinutes(hours.close) };
}

type Blocks = {
  /** Whole-day closure reason, if any. */
  closedAllDay: string | null;
  /** Partial closures affecting every table. */
  closedPeriods: Window[];
  /** Per-table blocks, keyed by table id. */
  tableBlocks: Map<string, Window[]>;
  /** Tables blocked for the whole day. */
  tablesBlockedAllDay: Map<string, string>;
};

async function loadBlocks(date: string): Promise<Blocks> {
  const db = getDb();

  const [closureRows, blockRows] = await Promise.all([
    db.select().from(schema.closures).where(eq(schema.closures.closureDate, date)),
    db.select().from(schema.tableBlocks).where(eq(schema.tableBlocks.blockDate, date)),
  ]);

  const result: Blocks = {
    closedAllDay: null,
    closedPeriods: [],
    tableBlocks: new Map(),
    tablesBlockedAllDay: new Map(),
  };

  for (const closure of closureRows) {
    if (!closure.startTime || !closure.endTime) {
      result.closedAllDay = closure.reason;
    } else {
      result.closedPeriods.push({
        start: toMinutes(closure.startTime),
        end: toMinutes(closure.endTime),
      });
    }
  }

  for (const block of blockRows) {
    if (!block.startTime || !block.endTime) {
      result.tablesBlockedAllDay.set(block.tableId, block.reason);
      continue;
    }
    const existing = result.tableBlocks.get(block.tableId) ?? [];
    existing.push({ start: toMinutes(block.startTime), end: toMinutes(block.endTime) });
    result.tableBlocks.set(block.tableId, existing);
  }

  return result;
}

type Booking = { tableId: string; start: number; end: number };

async function loadBookings(date: string, excludeReservationId?: string): Promise<Booking[]> {
  const db = getDb();

  const where = excludeReservationId
    ? and(
        eq(schema.reservations.reservationDate, date),
        inArray(schema.reservations.status, [...OCCUPYING_STATUSES]),
        ne(schema.reservations.id, excludeReservationId),
      )
    : and(
        eq(schema.reservations.reservationDate, date),
        inArray(schema.reservations.status, [...OCCUPYING_STATUSES]),
      );

  const rows = await db
    .select({
      tableId: schema.reservations.tableId,
      startTime: schema.reservations.startTime,
      endTime: schema.reservations.endTime,
    })
    .from(schema.reservations)
    .where(where);

  return rows
    .filter((row): row is typeof row & { tableId: string } => row.tableId !== null)
    .map((row) => {
    const start = toMinutes(row.startTime);
    let end = toMinutes(row.endTime);
    // An end at or before the start means the sitting runs past midnight.
    if (end <= start) end += 1440;
    return { tableId: row.tableId, start, end };
  });
}

/**
 * How many unassigned requests overlap a slot.
 *
 * A pending normal booking holds no table, so it cannot block one. It would
 * still be wrong to keep offering a time the restaurant has already promised
 * away, so these count against the free tables when a guest asks.
 */
async function countUnassignedRequests(date: string): Promise<Booking[]> {
  const rows = await getDb()
    .select({
      startTime: schema.reservations.startTime,
      endTime: schema.reservations.endTime,
      partySize: schema.reservations.partySize,
    })
    .from(schema.reservations)
    .where(
      and(
        eq(schema.reservations.reservationDate, date),
        isNull(schema.reservations.tableId),
        inArray(schema.reservations.status, ["pending", "confirmed"]),
      ),
    );

  return rows.map((row) => {
    const start = toMinutes(row.startTime);
    let end = toMinutes(row.endTime);
    if (end <= start) end += 1440;
    return { tableId: "unassigned", start, end };
  });
}

/* ───────────────────────────────────────────────────── date validation ──── */

export type DateCheck = { ok: true } | { ok: false; reason: UnavailableReason; message: string };

/** Is this date bookable at all — not past, within the horizon, not closed? */
export function checkDate(
  date: string,
  config: BookingConfig,
  today = restaurantToday(),
): DateCheck {
  const offset = daysBetween(today, date);
  if (offset < 0) return fail("past");
  if (offset > config.bookingHorizonDays) return fail("too-far-ahead");
  if (!serviceWindow(date, config)) return fail("closed");
  return { ok: true };
}

function fail(reason: UnavailableReason): DateCheck {
  return { ok: false, reason, message: REASON_MESSAGES[reason] };
}

/** The dates a guest may pick, for rendering the calendar. */
export async function bookableDateRange() {
  const config = await getBookingConfig();
  const today = restaurantToday();
  return {
    min: today,
    max: addDays(today, config.bookingHorizonDays),
    config,
  };
}

/* ─────────────────────────────────────────────────────────── the core ───── */

/**
 * Every table that can seat the party on the given date, with the sittings it
 * can still take. This is what the customer flow and the staff booking form
 * both render.
 */
export async function getDayAvailability(
  date: string,
  partySize: number,
  options: { excludeReservationId?: string; ignoreLeadTime?: boolean } = {},
): Promise<DayAvailability> {
  const config = await getBookingConfig();

  const dateCheck = checkDate(date, config);
  if (!dateCheck.ok) {
    return { date, partySize, closed: { reason: dateCheck.message }, tables: [] };
  }

  const window = serviceWindow(date, config)!;
  const blocks = await loadBlocks(date);

  if (blocks.closedAllDay) {
    return { date, partySize, closed: { reason: blocks.closedAllDay }, tables: [] };
  }

  const db = getDb();
  const [allTables, bookings] = await Promise.all([
    db.select().from(schema.tables).where(eq(schema.tables.isActive, true)),
    loadBookings(date, options.excludeReservationId),
  ]);

  const hold = turnMinutes(partySize, config);
  const today = restaurantToday();
  // Nothing in the past, and today needs enough runway before closing.
  const earliest =
    date === today && !options.ignoreLeadTime ? restaurantNowMinutes() : Number.NEGATIVE_INFINITY;
  const latestStart = window.end - config.lastBookingBufferMinutes;

  const candidates = allTables
    .filter((table) => table.capacity >= partySize)
    .sort((a, b) => a.capacity - b.capacity || a.sortOrder - b.sortOrder);

  const result: TableAvailability[] = [];

  for (const table of candidates) {
    if (blocks.tablesBlockedAllDay.has(table.id)) continue;

    const tableBookings = bookings.filter((b) => b.tableId === table.id);
    const tableBlockWindows = blocks.tableBlocks.get(table.id) ?? [];
    const slots: Slot[] = [];

    for (let start = window.start; start <= latestStart; start += config.slotIntervalMinutes) {
      const end = start + hold;
      if (start < earliest) continue;
      // The sitting must finish by closing time.
      if (end > window.end) continue;
      if (blocks.closedPeriods.some((p) => overlaps(start, end, p.start, p.end))) continue;
      if (tableBlockWindows.some((b) => overlaps(start, end, b.start, b.end))) continue;
      if (tableBookings.some((b) => overlaps(start, end, b.start, b.end))) continue;

      slots.push({ time: toTimeString(start), endTime: toTimeString(end) });
    }

    if (slots.length > 0) result.push({ table, slots });
  }

  return { date, partySize, closed: null, tables: result };
}

/**
 * Times a party can be offered when they are NOT choosing a table — the normal
 * booking flow. A time is offered when at least one suitable table is free,
 * after allowing for requests already taken for that slot.
 *
 * Built on `getDayAvailability`, so there is still exactly one availability
 * engine; this only collapses the per-table answer into a per-time one and
 * never reveals which tables exist.
 */
export async function getAvailableTimesForParty(
  date: string,
  partySize: number,
): Promise<{ closed: { reason: string } | null; times: string[] }> {
  const availability = await getDayAvailability(date, partySize);
  if (availability.closed) return { closed: availability.closed, times: [] };

  // How many distinct tables could take the party at each time.
  const capacityByTime = new Map<string, number>();
  for (const entry of availability.tables) {
    for (const slot of entry.slots) {
      capacityByTime.set(slot.time, (capacityByTime.get(slot.time) ?? 0) + 1);
    }
  }

  const pending = await countUnassignedRequests(date);
  const config = await getBookingConfig();

  const times = [...capacityByTime.entries()]
    .filter(([time, freeTables]) => {
      const start = toMinutes(time);
      const end = start + turnMinutes(partySize, config);
      const promised = pending.filter((p) => overlaps(start, end, p.start, p.end)).length;
      return freeTables - promised > 0;
    })
    .map(([time]) => time)
    .sort();

  return { closed: null, times };
}

/**
 * The gate for a booking with no table yet. Validates everything except the
 * table itself, so a request can never be taken for a closed day, a past time
 * or a party the room cannot seat.
 */
export async function assertTimeBookable(input: {
  date: string;
  startTime: string;
  partySize: number;
  ignoreLeadTime?: boolean;
}): Promise<{ endTime: string }> {
  const config = await getBookingConfig();

  if (input.partySize < config.minPartySize) throw unavailable("party-too-small");
  if (input.partySize > config.maxPartySize) throw unavailable("party-too-large");

  const dateCheck = checkDate(input.date, config);
  if (!dateCheck.ok) throw new SlotUnavailableError(dateCheck.reason, dateCheck.message);

  const window = serviceWindow(input.date, config)!;
  const start = toMinutes(input.startTime);
  const end = start + turnMinutes(input.partySize, config);

  if (start < window.start || end > window.end) throw unavailable("outside-service");
  if (!input.ignoreLeadTime && input.date === restaurantToday() && start < restaurantNowMinutes()) {
    throw unavailable("past");
  }

  const { closed, times } = await getAvailableTimesForParty(input.date, input.partySize);
  if (closed) throw new SlotUnavailableError("closed", closed.reason);
  if (!times.includes(input.startTime)) throw unavailable("table-booked");

  return { endTime: toTimeString(end) };
}

/**
 * The gate every write path goes through. Throws SlotUnavailableError with a
 * reason the UI can turn into a sentence.
 *
 * This is an application-level check for good error messages; the database
 * also carries an exclusion constraint, which is what actually guarantees two
 * simultaneous bookings cannot both land on the same table.
 */
export async function assertSlotBookable(input: {
  tableId: string;
  date: string;
  startTime: string;
  partySize: number;
  excludeReservationId?: string;
  /** Staff may seat a walk-in now; the customer flow may not book the past. */
  ignoreLeadTime?: boolean;
}): Promise<{ endTime: string }> {
  const config = await getBookingConfig();

  if (input.partySize < config.minPartySize) throw unavailable("party-too-small");
  if (input.partySize > config.maxPartySize) throw unavailable("party-too-large");

  const dateCheck = checkDate(input.date, config);
  if (!dateCheck.ok) throw new SlotUnavailableError(dateCheck.reason, dateCheck.message);

  const window = serviceWindow(input.date, config)!;
  const start = toMinutes(input.startTime);
  const end = start + turnMinutes(input.partySize, config);

  if (start < window.start || end > window.end) throw unavailable("outside-service");

  if (!input.ignoreLeadTime && input.date === restaurantToday() && start < restaurantNowMinutes()) {
    throw unavailable("past");
  }

  const db = getDb();
  const tableRows = await db
    .select()
    .from(schema.tables)
    .where(eq(schema.tables.id, input.tableId))
    .limit(1);

  const table = tableRows[0];
  if (!table) throw unavailable("table-inactive");
  if (!table.isActive) throw unavailable("table-inactive");
  if (table.capacity < input.partySize) throw unavailable("table-too-small");

  const blocks = await loadBlocks(input.date);
  if (blocks.closedAllDay) throw new SlotUnavailableError("closed", blocks.closedAllDay);
  if (blocks.closedPeriods.some((p) => overlaps(start, end, p.start, p.end))) {
    throw unavailable("closed");
  }
  if (blocks.tablesBlockedAllDay.has(input.tableId)) throw unavailable("table-blocked");
  if ((blocks.tableBlocks.get(input.tableId) ?? []).some((b) => overlaps(start, end, b.start, b.end))) {
    throw unavailable("table-blocked");
  }

  const bookings = await loadBookings(input.date, input.excludeReservationId);
  if (bookings.some((b) => b.tableId === input.tableId && overlaps(start, end, b.start, b.end))) {
    throw unavailable("table-booked");
  }

  return { endTime: toTimeString(end) };
}

function unavailable(reason: UnavailableReason) {
  return new SlotUnavailableError(reason, REASON_MESSAGES[reason]);
}
