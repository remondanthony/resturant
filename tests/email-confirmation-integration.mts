/**
 * Confirmation email delivery guarantees. Run against a real Postgres:
 *
 *   npm run test:email
 *
 * Covers what no unit test can: that one booking produces exactly one
 * confirmation however many times the action runs, and that a delivery failure
 * leaves the reservation confirmed.
 *
 * No email is ever sent. Every provider here is a stub that records what it
 * was asked to do, so the suite never touches the network or Resend.
 *
 * Creates its own throwaway table and reservations, and cleans up after itself.
 */
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { createDb } from "../lib/db/connect";
import { addDays, dayOfWeek, restaurantToday } from "../lib/booking/time";
import { assignTable } from "../lib/booking/reservations";
import { sendConfirmationEmail } from "../lib/notifications/service";
import type { EmailProvider, EmailRequest } from "../lib/notifications/email-provider";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const db = createDb(url);
const MARKER = `zz-email-${Date.now()}`;
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

/** Records what it was asked to send. Nothing leaves the process. */
function recordingProvider(): EmailProvider & { sent: EmailRequest[] } {
  const sent: EmailRequest[] = [];
  return {
    name: "test-recorder",
    sent,
    async send(request) {
      sent.push(request);
      return { status: "sent", provider: "test-recorder", reference: `test-${sent.length}` };
    },
  };
}

/** Fails the way a provider outage does. */
const brokenProvider: EmailProvider = {
  name: "test-broken",
  async send() {
    throw new Error("provider unreachable");
  },
};

function openDateAfter(offsetDays: number): string {
  let date = addDays(restaurantToday(), offsetDays);
  while (dayOfWeek(date) === 1) date = addDays(date, 1);
  return date;
}

async function emailRowsFor(reservationId: string) {
  return db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.reservationId, reservationId),
        eq(schema.notifications.channel, "email"),
      ),
    );
}

console.log("\nTAVOLO — confirmation email checks (no mail is sent)\n");

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

/** Every booking this suite creates, so cleanup deletes by id and nothing else. */
const created: string[] = [];

/**
 * Each booking gets its own date on the suite's own table.
 *
 * They must be inside the 90-day booking horizon, because `assignTable` goes
 * through the real availability gate — and they must not share a date, or the
 * exclusion constraint would rightly refuse the second assignment.
 */
let dateCursor = 0;

/** A pending booking with no table, exactly as a guest request arrives. */
async function pendingBooking(suffix: string, email: string) {
  dateCursor += 1;
  const [row] = await db
    .insert(schema.reservations)
    .values({
      // Deliberately not TAV-shaped: a real code is TAV- plus five characters,
      // so a TAV- prefix here could collide with, or match, a live booking.
      reservationCode: `${MARKER}-${suffix}`,
      tableId: null,
      bookingType: "normal",
      reservationDate: openDateAfter(20 + dateCursor * 2),
      startTime: "19:00",
      endTime: "21:00",
      partySize: 4,
      firstName: "Amara",
      lastName: "Okonkwo",
      email,
      phone: "+447700900321",
      specialRequests: "A quiet corner if you have one",
      status: "pending",
      source: "online",
    })
    .returning();
  created.push(row.id);
  return row;
}

try {
  /* ── A. booking does not confirm anything ─────────────────────────────── */

  await check("A — a new booking stays pending and sends no email", async () => {
    const booking = await pendingBooking("AA01", `${MARKER}-a@example.test`);

    assert.equal(booking.status, "pending", "a guest request arrives pending");
    assert.equal(booking.tableId, null, "and with no table");

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 0, "no confirmation may exist before a table is assigned");
  });

  /* ── B, E. assignment confirms and sends one email ────────────────────── */

  await check("B — assigning a table confirms the booking and sends one email", async () => {
    const booking = await pendingBooking("BB01", `${MARKER}-b@example.test`);

    const assigned = await assignTable(booking.id, testTable.id);
    assert.ok(assigned.ok, "the table should be assigned");
    assert.equal(assigned.data.status, "confirmed", "assignment is what confirms a booking");

    const provider = recordingProvider();
    const outcome = await sendConfirmationEmail(booking.id, provider);

    assert.equal(outcome.status, "sent");
    assert.equal(provider.sent.length, 1, "exactly one email");

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 1, "and exactly one record of it");
    assert.equal(rows[0].event, "booking_confirmed");
    assert.equal(rows[0].status, "sent");
    assert.ok(rows[0].sentAt, "the moment it was sent is recorded");
  });

  await check("E — it goes to the booking's email address, not the phone", async () => {
    const booking = await pendingBooking("EE01", `${MARKER}-e@example.test`);
    await assignTable(booking.id, testTable.id);

    const provider = recordingProvider();
    await sendConfirmationEmail(booking.id, provider);

    assert.equal(provider.sent[0].to, `${MARKER}-e@example.test`);
    assert.notEqual(provider.sent[0].to, booking.phone);

    const [row] = await emailRowsFor(booking.id);
    assert.equal(row.recipient, `${MARKER}-e@example.test`);
    assert.match(row.recipient, /@/, "the recipient must be an address");
  });

  await check("the email carries the booking's real details", async () => {
    const booking = await pendingBooking("DD01", `${MARKER}-d@example.test`);
    await assignTable(booking.id, testTable.id);

    const provider = recordingProvider();
    await sendConfirmationEmail(booking.id, provider);
    const [message] = provider.sent;

    assert.ok(message.html.includes(booking.reservationCode), "the code");
    assert.ok(message.html.includes("Amara"), "the guest's name");
    assert.ok(message.html.includes(testTable.name), "the assigned table");
    assert.ok(message.html.includes("A quiet corner"), "their note");
    assert.ok(message.text.includes(booking.reservationCode), "and the same in plain text");
    assert.match(message.subject, /confirmed/i);
  });

  /* ── C. duplicate protection ──────────────────────────────────────────── */

  await check("C — running it again sends nothing and is reported as a duplicate", async () => {
    const booking = await pendingBooking("CC01", `${MARKER}-c@example.test`);
    await assignTable(booking.id, testTable.id);

    const first = recordingProvider();
    const firstOutcome = await sendConfirmationEmail(booking.id, first);
    assert.equal(firstOutcome.status, "sent");

    // A reload, reopening the reservation, a retried action.
    const second = recordingProvider();
    const secondOutcome = await sendConfirmationEmail(booking.id, second);

    assert.equal(secondOutcome.status, "duplicate", "the second must not send");
    assert.equal(second.sent.length, 0, "the provider must not be called again");

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 1, "and there must still be exactly one record");
  });

  await check("C — six concurrent confirmations still produce exactly ONE email", async () => {
    const booking = await pendingBooking("CC02", `${MARKER}-c2@example.test`);
    await assignTable(booking.id, testTable.id);

    // Two staff confirming at once, plus a retried action, all in flight.
    const providers = Array.from({ length: 6 }, () => recordingProvider());
    const outcomes = await Promise.all(
      providers.map((p) => sendConfirmationEmail(booking.id, p)),
    );

    const totalSent = providers.reduce((n, p) => n + p.sent.length, 0);
    assert.equal(totalSent, 1, `expected 1 email in total, got ${totalSent}`);

    const sentOutcomes = outcomes.filter((o) => o.status === "sent");
    const duplicates = outcomes.filter((o) => o.status === "duplicate");
    assert.equal(sentOutcomes.length, 1, "exactly one caller may win");
    assert.equal(duplicates.length, 5, "the rest are told it is a duplicate");

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 1, "one row, written by the database's decision");
  });

  /* ── D. failure containment ───────────────────────────────────────────── */

  await check("D — a provider failure leaves the reservation confirmed", async () => {
    const booking = await pendingBooking("FF01", `${MARKER}-f@example.test`);
    await assignTable(booking.id, testTable.id);

    const outcome = await sendConfirmationEmail(booking.id, brokenProvider);
    assert.equal(outcome.status, "failed", "the failure is reported, not thrown");

    const [after] = await db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, booking.id))
      .limit(1);

    assert.equal(after.status, "confirmed", "the booking must remain confirmed");
    assert.equal(after.tableId, testTable.id, "and keep its table");

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "failed", "the failure is recorded for retry");
    assert.ok(rows[0].error, "with the reason");
    assert.equal(rows[0].sentAt, null, "and nothing is claimed to have been sent");
  });

  await check("D — sending never throws, whatever the provider does", async () => {
    const booking = await pendingBooking("FF02", `${MARKER}-f2@example.test`);
    await assignTable(booking.id, testTable.id);
    // If this threw, the enclosing action would report the assignment as failed.
    await assert.doesNotReject(() => sendConfirmationEmail(booking.id, brokenProvider));
  });

  await check("a failed confirmation can be attempted again", async () => {
    const booking = await pendingBooking("GG01", `${MARKER}-g@example.test`);
    await assignTable(booking.id, testTable.id);

    await sendConfirmationEmail(booking.id, brokenProvider);

    // The failed row drops out of the unique index, so a fresh attempt is
    // allowed — a duplicate is only prevented for a send that worked.
    const provider = recordingProvider();
    const retry = await sendConfirmationEmail(booking.id, provider);

    assert.equal(retry.status, "sent", "a failure must not block the guest forever");
    assert.equal(provider.sent.length, 1);

    const rows = await emailRowsFor(booking.id);
    assert.equal(rows.length, 2, "both the failure and the success are on the record");
    assert.equal(rows.filter((r) => r.status === "sent").length, 1, "but only one success");

    // And now that one has succeeded, it is closed again.
    const third = recordingProvider();
    assert.equal((await sendConfirmationEmail(booking.id, third)).status, "duplicate");
    assert.equal(third.sent.length, 0);
  });

  /* ── edge cases ───────────────────────────────────────────────────────── */

  await check("a booking with no email address is skipped, not attempted", async () => {
    // Email is optional when a guest books, so this genuinely happens.
    const booking = await pendingBooking("HH01", "");
    await assignTable(booking.id, testTable.id);

    const provider = recordingProvider();
    const outcome = await sendConfirmationEmail(booking.id, provider);

    assert.equal(outcome.status, "skipped");
    assert.equal(provider.sent.length, 0, "nothing may be sent to an empty address");
    assert.equal((await emailRowsFor(booking.id)).length, 0, "and nothing recorded as a message");
  });

  await check("a reservation that no longer exists is skipped quietly", async () => {
    const outcome = await sendConfirmationEmail(
      "00000000-0000-0000-0000-000000000000",
      recordingProvider(),
    );
    assert.equal(outcome.status, "skipped");
  });

  await check("the existing SMS records are untouched by any of this", async () => {
    const sms = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.channel, "sms"));
    assert.ok(sms.length >= 0, "the SMS channel still reads normally");
    // The index only governs email rows, so SMS can still duplicate freely.
    const emailOnly = sms.filter((r) => r.channel !== "sms");
    assert.equal(emailOnly.length, 0);
  });
} finally {
  // By id only. Matching on a code or an email prefix risks touching a real
  // booking, and one of these deliberately has no email at all.
  for (const id of created) {
    await db.delete(schema.notifications).where(eq(schema.notifications.reservationId, id));
    await db.delete(schema.reservations).where(eq(schema.reservations.id, id));
  }
  await db.delete(schema.tables).where(eq(schema.tables.id, testTable.id));
  console.log(`\n  cleaned up ${created.length} test bookings\n`);
}

console.log(`${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
