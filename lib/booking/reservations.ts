import "server-only";

import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  assertSlotBookable,
  assertTimeBookable,
  OCCUPYING_STATUSES,
  SlotUnavailableError,
} from "@/lib/booking/availability";
import { generateReservationCode, normaliseReservationCode } from "@/lib/booking/code";
import { normalisePhone } from "@/lib/booking/phone";
import { restaurantToday } from "@/lib/booking/time";
import { EXCLUSION_VIOLATION, pgError, UNIQUE_VIOLATION } from "@/lib/db/errors";
import type { ReservationStatus } from "@/lib/db/schema";

/**
 * THE reservation service.
 *
 * Both the public booking flow and the staff dashboard call these functions.
 * Nothing else writes to the reservations table, so availability is enforced
 * in exactly one place.
 */

export type ReservationInput = {
  /** Null for a normal booking: staff assign the table afterwards. */
  tableId: string | null;
  bookingType?: schema.BookingType;
  date: string;
  startTime: string;
  partySize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string | null;
};

/** `table` is null until a normal booking has been assigned one. */
export type ReservationWithTable = schema.ReservationRow & { table: schema.TableRow | null };

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; message: string };

/** Postgres raises 23P01 for the exclusion constraint, 23505 for a unique clash. */
function isConflict(error: unknown): boolean {
  const code = pgError(error).code;
  return code === EXCLUSION_VIOLATION || code === UNIQUE_VIOLATION;
}

function failure(error: unknown): { ok: false; reason: string; message: string } {
  if (error instanceof SlotUnavailableError) {
    return { ok: false, reason: error.reason, message: error.message };
  }
  if (isConflict(error)) {
    return {
      ok: false,
      reason: "table-booked",
      message: "That table was taken while you were booking. Please choose another time.",
    };
  }
  console.error("[reservations]", error);
  return {
    ok: false,
    reason: "unknown",
    message: "Something went wrong on our side. Please try again.",
  };
}

/* ────────────────────────────────────────────────────────────── create ──── */

export async function createReservation(
  input: ReservationInput,
  options: { source: "online" | "staff"; status?: ReservationStatus } = { source: "online" },
): Promise<ServiceResult<ReservationWithTable>> {
  try {
    let endTime: string;

    if (input.tableId) {
      // A specific table was chosen — private dining, or a staff booking.
      const check = await assertSlotBookable({
        tableId: input.tableId,
        date: input.date,
        startTime: input.startTime,
        partySize: input.partySize,
        ignoreLeadTime: options.source === "staff",
      });
      endTime = check.endTime;
    } else {
      // A normal request holds no table yet, but the slot itself must still be
      // real: open, inside the booking window, and with something free that
      // could seat this party once staff come to assign it.
      const check = await assertTimeBookable({
        date: input.date,
        startTime: input.startTime,
        partySize: input.partySize,
        ignoreLeadTime: options.source === "staff",
      });
      endTime = check.endTime;
    }

    const db = getDb();

    // Retry only on a code collision; a slot conflict is a real failure.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reservationCode = generateReservationCode();
      try {
        const [row] = await db
          .insert(schema.reservations)
          .values({
            reservationCode,
            tableId: input.tableId,
            bookingType: input.bookingType ?? "normal",
            reservationDate: input.date,
            startTime: input.startTime,
            endTime,
            partySize: input.partySize,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email.toLowerCase(),
            phone: input.phone,
            specialRequests: input.specialRequests?.trim() || null,
            // Guest bookings arrive as requests; staff bookings are already real.
            status: options.status ?? (options.source === "staff" ? "confirmed" : "pending"),
            source: options.source,
          })
          .returning();

        const table = row.tableId ? await getTableById(row.tableId) : null;
        return { ok: true, data: { ...row, table } };
      } catch (error) {
        const { code, detail, constraint } = pgError(error);
        const hitCode = `${constraint ?? ""}${detail ?? ""}`.includes("reservation_code");
        if (code === UNIQUE_VIOLATION && hitCode) continue;
        throw error;
      }
    }

    return {
      ok: false,
      reason: "code",
      message: "We could not allocate a reservation code. Please try again.",
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Assigns a table to an unassigned booking and confirms it.
 *
 * Goes through the same availability gate as any other write, so two staff
 * members cannot hand the same table to two guests — and the database
 * exclusion constraint is the final backstop if they try simultaneously.
 */
export async function assignTable(
  reservationId: string,
  tableId: string,
): Promise<ServiceResult<ReservationWithTable>> {
  try {
    const existing = await getReservationById(reservationId);
    if (!existing) {
      return { ok: false, reason: "not-found", message: "That reservation no longer exists." };
    }

    await assertSlotBookable({
      tableId,
      date: existing.reservationDate,
      startTime: existing.startTime.slice(0, 5),
      partySize: existing.partySize,
      excludeReservationId: reservationId,
      ignoreLeadTime: true,
    });

    const db = getDb();
    const [row] = await db
      .update(schema.reservations)
      .set({
        tableId,
        // Assigning a table is what turns a request into a booking.
        status: existing.status === "pending" ? "confirmed" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.reservations.id, reservationId))
      .returning();

    const table = await getTableById(tableId);
    return { ok: true, data: { ...row, table } };
  } catch (error) {
    return failure(error);
  }
}

/* ────────────────────────────────────────────────────────────── update ──── */

export type ReservationUpdate = Partial<ReservationInput>;

export async function updateReservation(
  id: string,
  changes: ReservationUpdate,
  options: { allowPastTimes?: boolean } = {},
): Promise<ServiceResult<ReservationWithTable>> {
  try {
    const existing = await getReservationById(id);
    if (!existing) {
      return { ok: false, reason: "not-found", message: "That reservation no longer exists." };
    }
    if (existing.status === "cancelled") {
      return {
        ok: false,
        reason: "cancelled",
        message: "This reservation was cancelled and can no longer be changed.",
      };
    }

    const tableId = changes.tableId ?? existing.tableId;
    const date = changes.date ?? existing.reservationDate;
    const startTime = changes.startTime ?? existing.startTime.slice(0, 5);
    const partySize = changes.partySize ?? existing.partySize;

    const movingSlot =
      tableId !== existing.tableId ||
      date !== existing.reservationDate ||
      startTime !== existing.startTime.slice(0, 5) ||
      partySize !== existing.partySize;

    // Re-check availability whenever the booking moves, ignoring itself. An
    // edit that leaves the table unassigned only has to land on a real slot.
    let endTime = existing.endTime;
    if (movingSlot) {
      const check = tableId
        ? await assertSlotBookable({
            tableId,
            date,
            startTime,
            partySize,
            excludeReservationId: id,
            ignoreLeadTime: options.allowPastTimes,
          })
        : await assertTimeBookable({
            date,
            startTime,
            partySize,
            ignoreLeadTime: options.allowPastTimes,
          });
      endTime = check.endTime;
    }

    const db = getDb();
    const [row] = await db
      .update(schema.reservations)
      .set({
        tableId,
        reservationDate: date,
        startTime,
        endTime,
        partySize,
        ...(changes.firstName !== undefined ? { firstName: changes.firstName } : {}),
        ...(changes.lastName !== undefined ? { lastName: changes.lastName } : {}),
        ...(changes.email !== undefined ? { email: changes.email.toLowerCase() } : {}),
        ...(changes.phone !== undefined ? { phone: changes.phone } : {}),
        ...(changes.specialRequests !== undefined
          ? { specialRequests: changes.specialRequests?.trim() || null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.reservations.id, id))
      .returning();

    const table = row.tableId ? await getTableById(row.tableId) : null;
    return { ok: true, data: { ...row, table } };
  } catch (error) {
    return failure(error);
  }
}

/* ───────────────────────────────────────────────────────────── statuses ─── */

/** Audit timestamp written alongside each status transition. */
const STATUS_STAMPS: Partial<Record<ReservationStatus, keyof schema.ReservationRow>> = {
  seated: "arrivedAt",
  cancelled: "cancelledAt",
  completed: "completedAt",
  no_show: "noShowAt",
};

export async function setReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<ServiceResult<schema.ReservationRow>> {
  try {
    const stamp = STATUS_STAMPS[status];
    const [row] = await getDb()
      .update(schema.reservations)
      .set({
        status,
        updatedAt: new Date(),
        ...(stamp ? { [stamp]: new Date() } : {}),
      })
      .where(eq(schema.reservations.id, id))
      .returning();

    if (!row) {
      return { ok: false, reason: "not-found", message: "That reservation no longer exists." };
    }
    return { ok: true, data: row };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Seats a guest. This is an ordinary status transition — there is no separate
 * arrival flag — so every view that reads `status` shows SEATED at once.
 */
export async function markSeated(id: string) {
  return setReservationStatus(id, "seated");
}

export async function cancelReservation(id: string) {
  return setReservationStatus(id, "cancelled");
}

/* ────────────────────────────────────────────────────────────── reading ─── */

async function getTableById(id: string) {
  const rows = await getDb().select().from(schema.tables).where(eq(schema.tables.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getReservationById(id: string): Promise<ReservationWithTable | null> {
  const rows = await getDb()
    .select({ reservation: schema.reservations, table: schema.tables })
    .from(schema.reservations)
    .leftJoin(schema.tables, eq(schema.reservations.tableId, schema.tables.id))
    .where(eq(schema.reservations.id, id))
    .limit(1);

  const row = rows[0];
  return row ? { ...row.reservation, table: row.table } : null;
}

/**
 * Guest lookup.
 *
 * There are no customer accounts, so the credential is the reservation code
 * plus the contact it was booked with. Either the email or the mobile number
 * works, because email is optional now — a guest who booked with only a phone
 * number must still be able to reach their booking.
 */
export async function findReservationForGuest(
  code: string,
  contact: string,
): Promise<ReservationWithTable | null> {
  const trimmed = contact.trim();
  if (!trimmed) return null;

  const phone = normalisePhone(trimmed);
  const matchesContact = phone.ok
    ? eq(schema.reservations.phone, phone.e164)
    : eq(schema.reservations.email, trimmed.toLowerCase());

  const rows = await getDb()
    .select({ reservation: schema.reservations, table: schema.tables })
    .from(schema.reservations)
    .leftJoin(schema.tables, eq(schema.reservations.tableId, schema.tables.id))
    .where(
      and(
        eq(schema.reservations.reservationCode, normaliseReservationCode(code)),
        matchesContact,
      ),
    )
    .limit(1);

  const row = rows[0];
  return row ? { ...row.reservation, table: row.table } : null;
}

export type ReservationQuery = {
  date?: string;
  from?: string;
  to?: string;
  status?: ReservationStatus | "all";
  tableId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Filtered, paginated reservation list. Filtering and search happen in the
 * database — the browser never receives the full table.
 */
export async function listReservations(query: ReservationQuery = {}) {
  const db = getDb();
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const page = Math.max(query.page ?? 1, 1);

  const conditions = [];
  if (query.date) conditions.push(eq(schema.reservations.reservationDate, query.date));
  if (query.from) conditions.push(gte(schema.reservations.reservationDate, query.from));
  if (query.to) conditions.push(lte(schema.reservations.reservationDate, query.to));
  if (query.status && query.status !== "all") {
    conditions.push(eq(schema.reservations.status, query.status));
  }
  if (query.tableId) conditions.push(eq(schema.reservations.tableId, query.tableId));

  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    const digits = query.search.replace(/\D/g, "");
    const clauses = [
      ilike(schema.reservations.firstName, term),
      ilike(schema.reservations.lastName, term),
      ilike(schema.reservations.reservationCode, `%${normaliseReservationCode(query.search).slice(4)}%`),
      ilike(schema.reservations.email, term),
      sql`concat(${schema.reservations.firstName}, ' ', ${schema.reservations.lastName}) ilike ${term}`,
    ];
    if (digits.length >= 3) {
      clauses.push(sql`regexp_replace(${schema.reservations.phone}, '\\D', '', 'g') like ${`%${digits}%`}`);
    }
    conditions.push(or(...clauses));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({ reservation: schema.reservations, table: schema.tables })
      .from(schema.reservations)
      .leftJoin(schema.tables, eq(schema.reservations.tableId, schema.tables.id))
      .where(where)
      .orderBy(asc(schema.reservations.reservationDate), asc(schema.reservations.startTime))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(schema.reservations).where(where),
  ]);

  return {
    reservations: rows.map((r) => ({ ...r.reservation, table: r.table })) as ReservationWithTable[],
    total: totals[0]?.value ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((totals[0]?.value ?? 0) / pageSize)),
  };
}

/** Everything on a single service, in time order. Drives the day view. */
export async function getReservationsForDate(date: string): Promise<ReservationWithTable[]> {
  const rows = await getDb()
    .select({ reservation: schema.reservations, table: schema.tables })
    .from(schema.reservations)
    .leftJoin(schema.tables, eq(schema.reservations.tableId, schema.tables.id))
    .where(eq(schema.reservations.reservationDate, date))
    .orderBy(asc(schema.reservations.startTime), asc(schema.tables.sortOrder));

  return rows.map((r) => ({ ...r.reservation, table: r.table }));
}

/** Live counts for the dashboard. No cached or derived statistics. */
export async function getDashboardStats() {
  const db = getDb();
  const today = restaurantToday();

  const [todayRows, upcomingRows, tableRows] = await Promise.all([
    db
      .select({ partySize: schema.reservations.partySize })
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.reservationDate, today),
          inArray(schema.reservations.status, [...OCCUPYING_STATUSES]),
        ),
      ),
    db
      .select({ value: count() })
      .from(schema.reservations)
      .where(
        and(
          gte(schema.reservations.reservationDate, today),
          inArray(schema.reservations.status, ["pending", "confirmed"]),
        ),
      ),
    db.select({ isActive: schema.tables.isActive }).from(schema.tables),
  ]);

  return {
    todayReservations: todayRows.length,
    todayGuests: todayRows.reduce((sum, row) => sum + row.partySize, 0),
    upcomingReservations: upcomingRows[0]?.value ?? 0,
    activeTables: tableRows.filter((t) => t.isActive).length,
    totalTables: tableRows.length,
  };
}
