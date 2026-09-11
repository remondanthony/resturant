-- One confirmation email per booking.
--
-- The notifications table already carries everything an email needs — channel,
-- recipient, status, provider, sent_at, error, attempts — so no column is
-- added here. What was missing is the guarantee that a reload, a retried
-- server action, or two staff confirming the same booking at the same moment
-- cannot each produce a message.
--
-- The index is the guarantee rather than a check-then-insert in application
-- code, which two callers can both pass. The insert is what competes, and
-- Postgres decides.
--
-- Scoped deliberately:
--   * channel = 'email'   — existing SMS rows are untouched, and this cannot
--                           collide with any row already in the table.
--   * status <> 'failed'  — a failed send drops out of the index so it can be
--                           attempted again, while a successful or in-flight
--                           one blocks a second.
--
-- Rows with a null reservation_id are not constrained, which is correct: a
-- unique index treats nulls as distinct, and every message this application
-- sends belongs to a booking.

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_one_email_confirmation_idx"
  ON "notifications" ("reservation_id", "event")
  WHERE "channel" = 'email' AND "status" <> 'failed';
