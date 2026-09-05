/**
 * Database integration checks. Run against a real Postgres:
 *
 *   npm run test:db
 *
 * Exercises the guarantees that cannot be proven without a database — most
 * importantly that two overlapping bookings on one table are impossible, even
 * when the application-level check is bypassed entirely.
 *
 * Creates its own throwaway table and reservations, and cleans up after itself.
 */
import assert from "node:assert/strict";
import { and, eq, like } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { createDb } from "../lib/db/connect";
import { pgError } from "../lib/db/errors";
import { addDays, dayOfWeek, restaurantToday } from "../lib/booking/time";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const db = createDb(url);

const MARKER = `zz-itest-${Date.now()}`;
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

async function cleanup(tableId?: string) {
  await db.delete(schema.reservations).where(like(schema.reservations.email, `${MARKER}%`));
  await db.delete(schema.closures).where(like(schema.closures.reason, `${MARKER}%`));
  if (tableId) {
    await db.delete(schema.tableBlocks).where(eq(schema.tableBlocks.tableId, tableId));
    await db.delete(schema.tables).where(eq(schema.tables.id, tableId));
  }
}

console.log("\nTAVOLO — database integration checks\n");

// A dedicated table so live data is never touched.
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

/**
 * Dates far enough out that no real booking collides, and never a Monday
 * (closed). Each test that needs a clean slate takes its own date, so one
 * test's bookings cannot make another's assertions fail — and the results do
 * not depend on which weekday the suite happens to run.
 */
function openDateAfter(offsetDays: number): string {
  let date = addDays(restaurantToday(), offsetDays);
  while (dayOfWeek(date) === 1) date = addDays(date, 1);
  return date;
}

const testDate = openDateAfter(45);
const raceDate = openDateAfter(60);
const availabilityDate = openDateAfter(75);

function reservation(code: string, start: string, end: string, extra: Partial<typeof schema.reservations.$inferInsert> = {}) {
  return {
    reservationCode: code,
    tableId: testTable.id,
    reservationDate: testDate,
    startTime: start,
    endTime: end,
    partySize: 2,
    firstName: "Test",
    lastName: "Guest",
    email: `${MARKER}@example.test`,
    phone: "+44 20 0000 0000",
    status: "confirmed" as const,
    ...extra,
  };
}

try {
  await check("a reservation can be written and read back", async () => {
    const [row] = await db
      .insert(schema.reservations)
      .values(reservation(`TAV-T${String(Date.now()).slice(-4)}`, "19:00", "21:00"))
      .returning();
    assert.equal(row.status, "confirmed");
    assert.equal(row.partySize, 2);
  });

  await check("an overlapping booking on the same table is REJECTED by the database", async () => {
    // 20:00–22:00 overlaps the 19:00–21:00 above. This bypasses the application
    // check entirely — the constraint is what must stop it.
    await assert.rejects(
      db.insert(schema.reservations).values(reservation("TAV-OVER1", "20:00", "22:00")),
      (error: unknown) => pgError(error).code === "23P01",
      "expected exclusion_violation (23P01)",
    );
  });

  await check("a back-to-back booking at the exact turnover time is ALLOWED", async () => {
    const [row] = await db
      .insert(schema.reservations)
      .values(reservation("TAV-BACK1", "21:00", "23:00"))
      .returning();
    assert.ok(row.id);
  });

  await check("two concurrent identical bookings — exactly one wins", async () => {
    const results = await Promise.allSettled([
      db.insert(schema.reservations).values(reservation("TAV-RACE1", "12:00", "14:00")),
      db.insert(schema.reservations).values(reservation("TAV-RACE2", "12:30", "14:30")),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    assert.equal(ok, 1, `expected exactly 1 to succeed, got ${ok}`);
  });

  await check("cancelling releases the table for the same slot", async () => {
    await db
      .update(schema.reservations)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(schema.reservations.tableId, testTable.id),
          eq(schema.reservations.startTime, "19:00:00"),
        ),
      );
    // The slot the first booking held is now free.
    const [row] = await db
      .insert(schema.reservations)
      .values(reservation("TAV-AFTR1", "19:00", "21:00"))
      .returning();
    assert.ok(row.id);
  });

  await check("reservation codes are unique", async () => {
    await assert.rejects(
      db.insert(schema.reservations).values(reservation("TAV-AFTR1", "08:00", "09:00")),
      (error: unknown) => pgError(error).code === "23505",
      "expected unique_violation (23505)",
    );
  });

  await check("concurrent bookings through the service: one wins, the other is told why", async () => {
    const { createReservation } = await import("../lib/booking/reservations");

    const slotDate = raceDate;
    const guest = (n: number) => ({
      tableId: testTable.id,
      date: slotDate,
      startTime: "19:00",
      partySize: 2,
      firstName: `Racer${n}`,
      lastName: "Test",
      email: `${MARKER}@example.test`,
      phone: "+44 20 0000 0000",
    });

    // Both callers pass the application-level availability check, then race.
    const [first, second] = await Promise.all([
      createReservation(guest(1)),
      createReservation(guest(2)),
    ]);

    const winners = [first, second].filter((r) => r.ok);
    const losers = [first, second].filter((r) => !r.ok);

    assert.equal(winners.length, 1, `expected exactly 1 booking to succeed, got ${winners.length}`);
    assert.equal(losers.length, 1);

    const loser = losers[0] as { ok: false; reason: string; message: string };
    // The message must name the real cause, not fall back to a generic error.
    assert.equal(
      loser.reason,
      "table-booked",
      `loser should report table-booked, got "${loser.reason}": ${loser.message}`,
    );
    assert.match(loser.message, /table/i);
  });

  await check("a SEATED guest still blocks their table", async () => {
    // Seating used to be a timestamp; it is now a status. If `seated` were
    // ever dropped from the exclusion constraint or from OCCUPYING_STATUSES,
    // a table would silently reopen while someone was sitting at it.
    const seatDate = openDateAfter(90);
    await db.insert(schema.reservations).values(
      reservation("TAV-SEAT1", "19:00", "21:00", { status: "seated", reservationDate: seatDate }),
    );

    await assert.rejects(
      db.insert(schema.reservations).values(
        reservation("TAV-SEAT2", "20:00", "22:00", { reservationDate: seatDate }),
      ),
      (error: unknown) => pgError(error).code === "23P01",
      "an overlapping booking must be refused while the guest is seated",
    );

    const { getDayAvailability } = await import("../lib/booking/availability");
    const slots = await getDayAvailability(seatDate, 2);
    const offered = slots.tables.find((t) => t.table.id === testTable.id);
    assert.ok(
      !offered?.slots.some((slot) => slot.time === "19:00"),
      "the availability engine must not offer a seated guest's slot",
    );
  });

  await check("an unassigned request holds no table", async () => {
    // Normal bookings arrive without a table. Several may want the same slot,
    // and none of them may block a table that has not been assigned yet.
    // Must stay inside the booking horizon, or availability returns nothing.
    const openDate = openDateAfter(85);
    const request = (code: string) => ({
      reservationCode: code,
      tableId: null,
      bookingType: "normal" as const,
      reservationDate: openDate,
      startTime: "19:00",
      endTime: "21:00",
      partySize: 2,
      firstName: "Unassigned",
      lastName: "Request",
      email: `${MARKER}@example.test`,
      phone: "+919876543210",
      status: "pending" as const,
    });

    await db.insert(schema.reservations).values(request("TAV-REQ01"));
    await db.insert(schema.reservations).values(request("TAV-REQ02"));

    // The test table is untouched by either request, so it stays bookable.
    const { getDayAvailability } = await import("../lib/booking/availability");
    const availability = await getDayAvailability(openDate, 2);
    const entry = availability.tables.find((t) => t.table.id === testTable.id);
    assert.ok(entry, "the table should still be offered");
    assert.ok(
      entry!.slots.some((slot) => slot.time === "19:00"),
      "an unassigned request must not block a table it has not been given",
    );
  });

  await check("a private dining booking holds its chosen room", async () => {
    const pdDate = openDateAfter(120);
    await db.insert(schema.reservations).values(
      reservation("TAV-PD001", "19:00", "21:00", {
        reservationDate: pdDate,
        bookingType: "private_dining",
        status: "pending",
      }),
    );

    await assert.rejects(
      db.insert(schema.reservations).values(
        reservation("TAV-PD002", "20:00", "22:00", {
          reservationDate: pdDate,
          bookingType: "private_dining",
        }),
      ),
      (error: unknown) => pgError(error).code === "23P01",
      "a second party must not get the same room at an overlapping time",
    );
  });

  await check("availability honours capacity, blocks and closures", async () => {
    const { getDayAvailability } = await import("../lib/booking/availability");

    const fits = await getDayAvailability(availabilityDate, 4);
    assert.ok(
      fits.tables.some((t) => t.table.id === testTable.id),
      "a 4-seat table should be offered to a party of 4",
    );

    const tooBig = await getDayAvailability(availabilityDate, 6);
    assert.ok(
      !tooBig.tables.some((t) => t.table.id === testTable.id),
      "a 4-seat table must never be offered to a party of 6",
    );

    await db.insert(schema.tableBlocks).values({
      tableId: testTable.id,
      blockDate: availabilityDate,
      reason: "integration test",
    });
    const blocked = await getDayAvailability(availabilityDate, 4);
    assert.ok(
      !blocked.tables.some((t) => t.table.id === testTable.id),
      "a blocked table must not be offered",
    );

    await db.insert(schema.closures).values({ closureDate: availabilityDate, reason: `${MARKER} closed` });
    const closed = await getDayAvailability(availabilityDate, 4);
    assert.ok(closed.closed, "a closed date must report closed");
    assert.equal(closed.tables.length, 0, "a closed date must offer no tables");
  });
} finally {
  await cleanup(testTable.id);
  console.log(`\n  cleaned up test data\n`);
}

console.log(`${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
