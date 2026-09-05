-- Prevents two live reservations from overlapping on the same table.
--
-- The application checks availability before writing (lib/booking/availability.ts),
-- but two requests can pass that check simultaneously. This constraint is what
-- actually guarantees the invariant: the second INSERT fails with SQLSTATE 23P01,
-- which the reservation service turns into "that table was just taken".
--
-- The CASE handles sittings that run past midnight (Friday and Saturday close
-- at 24:00), where end_time is numerically <= start_time.

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

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
  WHERE (status IN ('pending', 'confirmed', 'completed'));
