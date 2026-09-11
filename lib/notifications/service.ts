import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getReservationById } from "@/lib/booking/reservations";
import { buildMessage, type MessageContext } from "@/lib/notifications/messages";
import {
  buildConfirmationEmail,
  confirmationIdempotencyKey,
} from "@/lib/notifications/email-templates";
import {
  resolveEmailProvider,
  type EmailProvider,
  type EmailResult,
} from "@/lib/notifications/email-provider";
import { resolveProvider } from "@/lib/notifications/provider";
import { pgError, UNIQUE_VIOLATION } from "@/lib/db/errors";
import type { NotificationEvent } from "@/lib/db/schema";

/**
 * Sends guest notifications and records every attempt.
 *
 * Two rules hold this together:
 *
 *  - A booking never depends on a message. Delivery is attempted after the
 *    reservation is already committed, and a failure is written to the
 *    notifications table — it never changes the reservation's status.
 *  - Nothing claims a message was sent unless a provider says so. With no
 *    provider configured the attempt is recorded as `simulated`, and the
 *    dashboard shows it as such.
 */

export type NotifyInput = {
  reservationId: string;
  event: NotificationEvent;
  recipient: string;
  context: MessageContext;
};

export type NotifyOutcome = {
  status: schema.NotificationRow["status"];
  message: string | null;
  provider: string;
};

export async function notifyGuest(input: NotifyInput): Promise<NotifyOutcome> {
  const message = buildMessage(input.event, input.context);
  const provider = resolveProvider();

  // Some events have nothing worth saying; skip rather than send noise.
  if (!message) {
    return { status: "pending", message: null, provider: provider.name };
  }

  const db = getDb();

  // Record the intent first, so an attempt is never lost if delivery throws.
  const [row] = await db
    .insert(schema.notifications)
    .values({
      reservationId: input.reservationId,
      event: input.event,
      channel: "sms",
      recipient: input.recipient,
      message,
      status: "pending",
      provider: provider.name,
      attempts: 1,
    })
    .returning();

  try {
    const result = await provider.send({ to: input.recipient, message });

    await db
      .update(schema.notifications)
      .set({
        status: result.status === "failed" ? "failed" : result.status,
        provider: result.provider,
        error: result.status === "failed" ? result.error : null,
        sentAt: result.status === "failed" ? null : new Date(),
      })
      .where(eq(schema.notifications.id, row.id));

    return { status: result.status === "failed" ? "failed" : result.status, message, provider: result.provider };
  } catch (error) {
    // A provider outage must never surface as a booking failure.
    const detail = error instanceof Error ? error.message : "Unknown delivery error";
    console.error("[notifications] delivery failed", detail);

    await db
      .update(schema.notifications)
      .set({ status: "failed", error: detail })
      .where(eq(schema.notifications.id, row.id));

    return { status: "failed", message, provider: provider.name };
  }
}

/** Attempts a previously failed message again, recording a fresh attempt. */
export async function retryNotification(notificationId: string): Promise<NotifyOutcome | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.id, notificationId))
    .limit(1);

  const existing = rows[0];
  if (!existing) return null;

  // An email is retried through the email provider and rebuilt from the
  // booking as it stands, so a retry never re-sends stale details. The
  // idempotency key is unchanged, so if the original was in fact accepted
  // before it appeared to fail, this does not produce a second message.
  if (existing.channel === "email" && existing.reservationId) {
    return retryConfirmationEmail(existing);
  }

  const provider = resolveProvider();

  try {
    const result = await provider.send({ to: existing.recipient, message: existing.message });
    await db
      .update(schema.notifications)
      .set({
        status: result.status === "failed" ? "failed" : result.status,
        provider: result.provider,
        error: result.status === "failed" ? result.error : null,
        attempts: existing.attempts + 1,
        sentAt: result.status === "failed" ? null : new Date(),
      })
      .where(eq(schema.notifications.id, notificationId));

    return {
      status: result.status === "failed" ? "failed" : result.status,
      message: existing.message,
      provider: result.provider,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown delivery error";
    await db
      .update(schema.notifications)
      .set({ status: "failed", error: detail, attempts: existing.attempts + 1 })
      .where(eq(schema.notifications.id, notificationId));
    return { status: "failed", message: existing.message, provider: provider.name };
  }
}

/* ─────────────────────────────────────────────── confirmation by email ─── */

export type EmailOutcome = {
  status: "sent" | "simulated" | "failed" | "skipped" | "duplicate";
  provider: string;
  /** Why nothing was sent, when nothing was. */
  reason?: string;
};

/** Rebuilds the confirmation from the booking as it stands right now. */
async function confirmationFor(reservationId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) return null;

  const to = reservation.email?.trim() ?? "";
  if (!to) return { reservation, to: "", email: null };

  return {
    reservation,
    to,
    email: buildConfirmationEmail({
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      reservationCode: reservation.reservationCode,
      date: reservation.reservationDate,
      startTime: reservation.startTime,
      partySize: reservation.partySize,
      tableName: reservation.table?.name ?? null,
      specialRequests: reservation.specialRequests,
    }),
  };
}

/**
 * Sends the guest their confirmation, once.
 *
 * Called after the table has been assigned and the booking is already
 * confirmed in the database. It never throws and never reports a problem to
 * the caller as a failure of the assignment — the worst outcome here is a
 * recorded failure that staff can retry.
 *
 * Duplicate protection is the database's, not this function's. The insert
 * carries a partial unique index over (reservation_id, event) for unfailed
 * email rows, so a reload, a retried action or two staff confirming at the
 * same moment produces one row and one send. The loser is told `duplicate`
 * and sends nothing.
 */
export async function sendConfirmationEmail(
  reservationId: string,
  /** Defaulted from the environment; injectable so the failure path is testable. */
  provider: EmailProvider = resolveEmailProvider(),
): Promise<EmailOutcome> {
  try {
    const built = await confirmationFor(reservationId);
    if (!built) {
      return { status: "skipped", provider: provider.name, reason: "Reservation not found." };
    }
    if (!built.email) {
      // Email is optional when a guest books, so some bookings have none.
      // Saying so plainly beats attempting a send to an empty address.
      return {
        status: "skipped",
        provider: provider.name,
        reason: "This booking has no email address.",
      };
    }

    const db = getDb();
    let row: schema.NotificationRow;

    try {
      // The intent is recorded first, so an attempt is never lost, and it is
      // this insert that the unique index judges.
      [row] = await db
        .insert(schema.notifications)
        .values({
          reservationId,
          event: "booking_confirmed",
          channel: "email",
          recipient: built.to,
          // The subject, so the history reads as a line rather than a wall.
          message: built.email.subject,
          status: "pending",
          provider: provider.name,
          attempts: 1,
        })
        .returning();
    } catch (error) {
      if (pgError(error).code === UNIQUE_VIOLATION) {
        return {
          status: "duplicate",
          provider: provider.name,
          reason: "A confirmation has already been sent for this booking.",
        };
      }
      throw error;
    }

    // The send has its own guard. A provider that throws must still leave the
    // row marked failed rather than stuck at `pending`: a pending row stays
    // inside the unique index, which would block every later attempt and leave
    // the guest with no confirmation at all.
    let result: EmailResult;
    try {
      result = await provider.send({
        to: built.to,
        subject: built.email.subject,
        html: built.email.html,
        text: built.email.text,
        idempotencyKey: confirmationIdempotencyKey(reservationId),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown delivery error";
      console.error("[email] confirmation failed:", detail);
      result = { status: "failed", provider: provider.name, error: detail };
    }

    await db
      .update(schema.notifications)
      .set({
        status: result.status === "failed" ? "failed" : result.status,
        provider: result.provider,
        error: result.status === "failed" ? result.error : null,
        sentAt: result.status === "failed" ? null : new Date(),
      })
      .where(eq(schema.notifications.id, row.id));

    return {
      status: result.status,
      provider: result.provider,
      reason: result.status === "failed" ? result.error : undefined,
    };
  } catch (error) {
    // Nothing here may reach the caller: the booking is already confirmed and
    // a delivery problem must not be reported as a failure to assign a table.
    const detail = error instanceof Error ? error.message : "Unknown delivery error";
    console.error("[email] confirmation failed", detail);
    return { status: "failed", provider: provider.name, reason: detail };
  }
}

/** Re-attempts a confirmation email against the same notification row. */
async function retryConfirmationEmail(
  existing: schema.NotificationRow,
): Promise<NotifyOutcome> {
  const db = getDb();
  const provider = resolveEmailProvider();
  const reservationId = existing.reservationId!;

  const stamp = async (
    status: schema.NotificationRow["status"],
    error: string | null,
    providerName: string,
  ) => {
    await db
      .update(schema.notifications)
      .set({
        status,
        provider: providerName,
        error,
        attempts: existing.attempts + 1,
        sentAt: status === "failed" ? null : new Date(),
      })
      .where(eq(schema.notifications.id, existing.id));
  };

  try {
    const built = await confirmationFor(reservationId);
    if (!built?.email) {
      await stamp("failed", "This booking has no email address.", provider.name);
      return { status: "failed", message: existing.message, provider: provider.name };
    }

    const result = await provider.send({
      to: built.to,
      subject: built.email.subject,
      html: built.email.html,
      text: built.email.text,
      idempotencyKey: confirmationIdempotencyKey(reservationId),
    });

    await stamp(
      result.status === "failed" ? "failed" : result.status,
      result.status === "failed" ? result.error : null,
      result.provider,
    );

    return {
      status: result.status === "failed" ? "failed" : result.status,
      message: existing.message,
      provider: result.provider,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown delivery error";
    console.error("[email] retry failed", detail);
    await stamp("failed", detail, provider.name);
    return { status: "failed", message: existing.message, provider: provider.name };
  }
}

/** The message history for one reservation, newest first. */
export async function getNotificationsFor(reservationId: string) {
  return getDb()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.reservationId, reservationId))
    .orderBy(desc(schema.notifications.createdAt));
}
