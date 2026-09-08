-- Food preparation timers.
--
-- The timer lives in the database rather than in a browser, so remaining time
-- survives a refresh, a closed tab and a sleeping laptop, and every device
-- reading the row sees the same countdown.

CREATE TYPE "prep_timer_status" AS ENUM (
  'preparing', 'paused', 'delayed', 'ready', 'completed', 'cancelled'
);--> statement-breakpoint

CREATE TYPE "prep_timer_event_type" AS ENUM (
  'started', 'paused', 'resumed', 'extended', 'reduced',
  'auto_extended', 'ready', 'completed', 'cancelled'
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "prep_timers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL REFERENCES "reservations"("id") ON DELETE CASCADE,
  "status" "prep_timer_status" DEFAULT 'preparing' NOT NULL,
  "original_duration_minutes" integer NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ends_at" timestamp with time zone,
  "remaining_ms_at_pause" integer,
  "extension_count" integer DEFAULT 0 NOT NULL,
  "auto_extension_count" integer DEFAULT 0 NOT NULL,
  "ready_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "prep_timer_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "timer_id" uuid NOT NULL REFERENCES "prep_timers"("id") ON DELETE CASCADE,
  "event" "prep_timer_event_type" NOT NULL,
  "delta_minutes" integer,
  "staff_user_id" uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "prep_timers_reservation_idx" ON "prep_timers" ("reservation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prep_timers_status_idx" ON "prep_timers" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prep_timer_events_timer_idx" ON "prep_timer_events" ("timer_id");--> statement-breakpoint

-- One live timer per booking, enforced here rather than by checking first and
-- hoping. Two staff pressing Start at the same moment cannot both win: the
-- second insert is refused by the database. Finished timers are excluded from
-- the index, so the same booking can be given a fresh timer afterwards.
CREATE UNIQUE INDEX IF NOT EXISTS "prep_timers_one_active_idx"
  ON "prep_timers" ("reservation_id")
  WHERE "status" IN ('preparing', 'paused', 'delayed');--> statement-breakpoint

-- A running timer must have an end; a paused one must have kept what was left.
-- Neither can be true of a finished timer.
ALTER TABLE "prep_timers" ADD CONSTRAINT "prep_timers_shape_ck" CHECK (
  (status IN ('preparing', 'delayed') AND ends_at IS NOT NULL AND remaining_ms_at_pause IS NULL)
  OR (status = 'paused' AND remaining_ms_at_pause IS NOT NULL AND remaining_ms_at_pause >= 0)
  OR (status IN ('ready', 'completed', 'cancelled'))
);--> statement-breakpoint

-- Carries timer changes to any open dashboard, using the trigger function
-- already defined in 0002. The payload is still only entity, op and row id.
DROP TRIGGER IF EXISTS prep_timers_notify ON "prep_timers";--> statement-breakpoint
CREATE TRIGGER prep_timers_notify
  AFTER INSERT OR UPDATE OR DELETE ON "prep_timers"
  FOR EACH ROW EXECUTE FUNCTION tavolo_notify_change();
