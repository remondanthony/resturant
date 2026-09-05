-- Makes SEATED a real reservation status.
--
-- Arrival used to live in the `arrived_at` timestamp while the status stayed
-- `confirmed`, which meant a row had two things to read to know its state.
-- There is now one canonical status; `arrived_at` is kept purely as an audit
-- timestamp alongside cancelled_at / completed_at / no_show_at.
--
-- The enum is recreated rather than extended with ALTER TYPE ... ADD VALUE,
-- because a value added inside a transaction cannot be used until that
-- transaction commits — and the migrator runs every pending migration in one.
--
-- CRITICAL: the exclusion constraint is recreated to include 'seated'. A
-- seated guest is still sitting at the table, so their reservation must keep
-- blocking it. Omitting it here would silently reopen the table to double
-- bookings.

ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_no_overlap";--> statement-breakpoint

ALTER TYPE "reservation_status" RENAME TO "reservation_status_old";--> statement-breakpoint

CREATE TYPE "reservation_status" AS ENUM (
  'pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'
);--> statement-breakpoint

ALTER TABLE "reservations" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "reservations"
  ALTER COLUMN "status" TYPE "reservation_status"
  USING "status"::text::"reservation_status";--> statement-breakpoint

ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'confirmed';--> statement-breakpoint

DROP TYPE "reservation_status_old";--> statement-breakpoint

-- Anyone already recorded as arrived becomes seated.
UPDATE "reservations"
  SET "status" = 'seated'
  WHERE "status" = 'confirmed' AND "arrived_at" IS NOT NULL;--> statement-breakpoint

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
  WHERE (status IN ('pending', 'confirmed', 'seated', 'completed'));
