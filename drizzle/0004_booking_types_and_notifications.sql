-- Splits bookings into two experiences and makes the table optional.
--
-- NORMAL bookings are requests: the guest picks a date, time and party size,
-- and staff assign a table afterwards, so `table_id` starts NULL.
-- PRIVATE_DINING bookings carry the space the guest chose, so `table_id` is
-- set at creation.
--
-- The exclusion constraint gains an explicit `table_id IS NOT NULL` predicate.
-- NULLs would not collide under `=` anyway, but saying so keeps the intent
-- readable: an unassigned request holds no table and blocks nobody.

CREATE TYPE "booking_type" AS ENUM ('normal', 'private_dining');--> statement-breakpoint

ALTER TABLE "reservations"
  ADD COLUMN "booking_type" "booking_type" NOT NULL DEFAULT 'normal';--> statement-breakpoint

ALTER TABLE "reservations" ALTER COLUMN "table_id" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_no_overlap";--> statement-breakpoint

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "table_id" WITH =,
    tsrange(
      ("reservation_date" + "start_time"),
      ("reservation_date" + "end_time")
        + (CASE WHEN "end_time" <= "start_time" THEN interval '1 day' ELSE interval '0 day' END),
      '[)'
    ) WITH &&
  )
  WHERE (
    "table_id" IS NOT NULL
    AND status IN ('pending', 'confirmed', 'seated', 'completed')
  );--> statement-breakpoint

-- Which tables a guest may choose from on the private dining page. Explicit
-- rather than matching on the free-text `type`, which staff can rename.
ALTER TABLE "tables"
  ADD COLUMN "is_private_dining" boolean NOT NULL DEFAULT false;--> statement-breakpoint

UPDATE "tables" SET "is_private_dining" = true WHERE lower("type") = 'private';--> statement-breakpoint

-- Outbound message log. One row per attempt, so a failure is recorded and can
-- be retried without the booking itself being affected.
CREATE TYPE "notification_event" AS ENUM (
  'booking_received', 'booking_confirmed', 'booking_modified',
  'booking_cancelled', 'booking_completed'
);--> statement-breakpoint

CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'simulated', 'failed');--> statement-breakpoint

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid REFERENCES "reservations"("id") ON DELETE CASCADE,
  "event" "notification_event" NOT NULL,
  "channel" text NOT NULL DEFAULT 'sms',
  "recipient" text NOT NULL,
  "message" text NOT NULL,
  "status" "notification_status" NOT NULL DEFAULT 'pending',
  "provider" text,
  "error" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone
);--> statement-breakpoint

CREATE INDEX "notifications_reservation_idx" ON "notifications" ("reservation_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" ("status");
