import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { buildMessage, type MessageContext } from "@/lib/notifications/messages";
import { resolveProvider } from "@/lib/notifications/provider";
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

/** The message history for one reservation, newest first. */
export async function getNotificationsFor(reservationId: string) {
  return getDb()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.reservationId, reservationId))
    .orderBy(desc(schema.notifications.createdAt));
}
