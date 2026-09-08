/**
 * Shared shapes for the realtime channel.
 *
 * Kept free of `server-only` and of any driver import so the browser code can
 * use the same types as the stream that produces them.
 */

export const CHANGE_CHANNEL = "tavolo_changes";

/** Tables whose changes the dashboard cares about. */
export type ChangeEntity =
  | "reservations"
  | "tables"
  | "table_blocks"
  | "closures"
  | "prep_timers";
export type ChangeOp = "insert" | "update" | "delete";

/** Exactly what the database trigger puts on the channel — no guest data. */
export type ChangePayload = {
  entity: ChangeEntity;
  op: ChangeOp;
  id: string;
};

/**
 * What a connected dashboard receives. `reservation` is present only for
 * reservation inserts and updates, and carries the minimum a staff member
 * needs to recognise the booking — deliberately no email, phone or notes.
 */
export type RealtimeEvent = {
  /** Stable per delivery, used by the client to discard repeats. */
  eventId: string;
  entity: ChangeEntity;
  op: ChangeOp;
  id: string;
  reservation?: {
    id: string;
    reservationCode: string;
    guestName: string;
    partySize: number;
    /** Null while a normal booking is still waiting on a table. */
    tableName: string | null;
    bookingType: "normal" | "private_dining";
    date: string;
    startTime: string;
    status: string;
  };
};

export function isChangePayload(value: unknown): value is ChangePayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChangePayload>;
  return (
    typeof candidate.id === "string" &&
    (candidate.op === "insert" || candidate.op === "update" || candidate.op === "delete") &&
    (candidate.entity === "reservations" ||
      candidate.entity === "tables" ||
      candidate.entity === "table_blocks" ||
      candidate.entity === "closures" ||
      candidate.entity === "prep_timers")
  );
}
