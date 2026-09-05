import { randomUUID } from "node:crypto";
import { getStaffUser } from "@/lib/auth/dal";
import { getReservationById } from "@/lib/booking/reservations";
import { subscribeToChanges } from "@/lib/realtime/listener";
import type { ChangePayload, RealtimeEvent } from "@/lib/realtime/events";

/**
 * The staff dashboard's realtime channel, as Server-Sent Events.
 *
 * Two independent gates protect it: it lives under /admin so `proxy.ts`
 * refuses unauthenticated requests, and `getStaffUser()` re-checks the session
 * against the database here. There is no public equivalent — guests never
 * subscribe to reservation data.
 *
 * Events carry only what a staff member needs to recognise a booking. Email,
 * phone and special requests are never pushed; the dashboard reads those from
 * the database on the detail page, behind the same authorization.
 */

export const dynamic = "force-dynamic";
/** Long-lived connection: needs the Node runtime, never the edge. */
export const runtime = "nodejs";

/**
 * Heartbeat interval. Sent as a named event rather than a comment: comments
 * keep proxies awake but are invisible to EventSource, so a client could not
 * tell a dead connection from a quiet one. The dashboard watchdog expects a
 * ping well inside its own timeout.
 */
const HEARTBEAT_MS = 10_000;

export async function GET(request: Request) {
  const user = await getStaffUser();
  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "cache-control": "no-store" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let heartbeat: NodeJS.Timeout | null = null;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const sendEvent = (event: RealtimeEvent) => {
        send(`id: ${event.eventId}\ndata: ${JSON.stringify(event)}\n\n`);
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      };

      // Tell the client it is live before anything else arrives.
      send(`retry: 3000\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);

      const onChange = (payload: ChangePayload) => {
        // The notification says only that something changed; the row is read
        // back from the database so the dashboard never trusts the channel.
        void (async () => {
          const event: RealtimeEvent = {
            eventId: randomUUID(),
            entity: payload.entity,
            op: payload.op,
            id: payload.id,
          };

          if (payload.entity === "reservations" && payload.op !== "delete") {
            try {
              const reservation = await getReservationById(payload.id);
              if (reservation) {
                event.reservation = {
                  id: reservation.id,
                  reservationCode: reservation.reservationCode,
                  guestName: `${reservation.firstName} ${reservation.lastName}`,
                  partySize: reservation.partySize,
                  tableName: reservation.table?.name ?? null,
                  date: reservation.reservationDate,
                  startTime: reservation.startTime,
                  status: reservation.status,
                  bookingType: reservation.bookingType,
                };
              }
            } catch (error) {
              // Send the bare event regardless — the dashboard resyncs from
              // the database anyway, so a lookup failure loses nothing.
              console.error("[stream] could not read reservation", error);
            }
          }

          sendEvent(event);
        })();
      };

      unsubscribe = await subscribeToChanges(onChange);
      heartbeat = setInterval(
        () => send(`event: ping\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`),
        HEARTBEAT_MS,
      );

      request.signal.addEventListener("abort", cleanup);
      if (request.signal.aborted) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      // Stops reverse proxies buffering the stream into uselessness.
      "x-accel-buffering": "no",
    },
  });
}
