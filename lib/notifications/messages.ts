import type { NotificationEvent } from "@/lib/db/schema";
import { formatShortDate, formatTime } from "@/lib/booking/time";
import { site } from "@/lib/site";

/** Everything a message needs, with no database types leaking in. */
export type MessageContext = {
  guestName: string;
  date: string;
  startTime: string;
  partySize: number;
  tableName: string | null;
  reservationCode: string;
};

/**
 * Message bodies. Deliberately short — an SMS segment is 160 characters and
 * guests read these on a lock screen.
 */
export function buildMessage(
  event: NotificationEvent,
  context: MessageContext,
): string | null {
  const when = `${formatTime(context.startTime)} on ${formatShortDate(context.date)}`;
  const guests = `${context.partySize} ${context.partySize === 1 ? "guest" : "guests"}`;
  const table = context.tableName ? ` ${context.tableName}.` : "";

  switch (event) {
    case "booking_received":
      return `${site.name}: We have your request for ${when}, ${guests}. We'll confirm your table shortly. Ref ${context.reservationCode}.`;

    case "booking_confirmed":
      return `${site.name}: Your reservation is confirmed for ${when}, ${guests}.${table} Reservation ${context.reservationCode}.`;

    case "booking_modified":
      return `${site.name}: Your reservation ${context.reservationCode} has moved to ${when}, ${guests}.${table}`;

    case "booking_cancelled":
      return `${site.name}: Your reservation ${context.reservationCode} for ${when} has been cancelled. Call us to rebook.`;

    // Nothing useful to say to a guest who has just finished dinner.
    case "booking_completed":
      return null;
  }
}
