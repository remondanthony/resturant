import "server-only";

import { eq, inArray, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { OCCUPYING_STATUSES } from "@/lib/booking/availability";
import { overlaps, restaurantNowMinutes, restaurantToday, toMinutes } from "@/lib/booking/time";

/**
 * Live table state, derived — never stored.
 *
 * Storing a status column would drift the moment anything changed elsewhere.
 * This reads reservations and blocks and computes the answer, so the floor plan
 * cannot disagree with the book.
 */

export type TableState = "available" | "reserved" | "occupied" | "unavailable";

export type FloorTable = {
  table: schema.TableRow;
  state: TableState;
  /** The booking that makes it reserved or occupied. */
  current: {
    id: string;
    reservationCode: string;
    guestName: string;
    partySize: number;
    startTime: string;
    endTime: string;
    seated: boolean;
  } | null;
  /** Why it is unavailable, when it is. */
  blockedReason: string | null;
  /** Next booking later in the service. */
  nextTime: string | null;
};

export async function getFloorPlan(
  date: string = restaurantToday(),
  atMinutes?: number,
): Promise<FloorTable[]> {
  const db = getDb();
  const now = atMinutes ?? (date === restaurantToday() ? restaurantNowMinutes() : -1);

  const [tables, reservations, blocks, closures] = await Promise.all([
    db.select().from(schema.tables).orderBy(schema.tables.sortOrder),
    db
      .select()
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.reservationDate, date),
          inArray(schema.reservations.status, [...OCCUPYING_STATUSES]),
        ),
      ),
    db.select().from(schema.tableBlocks).where(eq(schema.tableBlocks.blockDate, date)),
    db.select().from(schema.closures).where(eq(schema.closures.closureDate, date)),
  ]);

  const closedAllDay = closures.find((c) => !c.startTime || !c.endTime);

  return tables.map((table) => {
    if (!table.isActive) {
      return { table, state: "unavailable", current: null, blockedReason: "Out of service", nextTime: null };
    }
    if (closedAllDay) {
      return { table, state: "unavailable", current: null, blockedReason: closedAllDay.reason, nextTime: null };
    }

    const tableBlocks = blocks.filter((b) => b.tableId === table.id);
    const allDayBlock = tableBlocks.find((b) => !b.startTime || !b.endTime);
    if (allDayBlock) {
      return { table, state: "unavailable", current: null, blockedReason: allDayBlock.reason, nextTime: null };
    }

    const activeBlock = tableBlocks.find(
      (b) =>
        b.startTime &&
        b.endTime &&
        now >= toMinutes(b.startTime) &&
        now < toMinutes(b.endTime),
    );
    if (activeBlock) {
      return { table, state: "unavailable", current: null, blockedReason: activeBlock.reason, nextTime: null };
    }

    const forTable = reservations
      .filter((r) => r.tableId === table.id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const current = forTable.find((r) => {
      const start = toMinutes(r.startTime);
      let end = toMinutes(r.endTime);
      if (end <= start) end += 1440;
      return overlaps(now, now + 1, start, end);
    });

    const next = forTable.find((r) => toMinutes(r.startTime) > now);

    if (current) {
      return {
        table,
        // Seated is a timestamp on the reservation, so this stays in step.
        // One canonical status decides this; nothing is derived from timestamps.
        state: current.status === "seated" ? "occupied" : "reserved",
        current: {
          id: current.id,
          reservationCode: current.reservationCode,
          guestName: `${current.firstName} ${current.lastName}`,
          partySize: current.partySize,
          startTime: current.startTime,
          endTime: current.endTime,
          seated: current.status === "seated",
        },
        blockedReason: null,
        nextTime: next ? next.startTime : null,
      };
    }

    return {
      table,
      state: "available",
      current: null,
      blockedReason: null,
      nextTime: next ? next.startTime : null,
    };
  });
}
