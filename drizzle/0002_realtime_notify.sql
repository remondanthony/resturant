-- Emits a NOTIFY whenever data the dashboard displays changes.
--
-- The trigger fires AFTER the statement, so the notification is only delivered
-- when the surrounding transaction COMMITs. A rolled-back booking therefore
-- never reaches a dashboard — the database stays the source of truth.
--
-- The payload carries no guest data: only the entity, the operation and the
-- row id. The authenticated stream looks the row up and decides what a staff
-- member is allowed to see, so no personal information travels the channel.

CREATE OR REPLACE FUNCTION tavolo_notify_change() RETURNS trigger AS $$
DECLARE
  changed record;
BEGIN
  changed := CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;

  PERFORM pg_notify(
    'tavolo_changes',
    json_build_object(
      'entity', TG_TABLE_NAME,
      'op', lower(TG_OP),
      'id', changed.id
    )::text
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS reservations_notify ON "reservations";--> statement-breakpoint
CREATE TRIGGER reservations_notify
  AFTER INSERT OR UPDATE OR DELETE ON "reservations"
  FOR EACH ROW EXECUTE FUNCTION tavolo_notify_change();--> statement-breakpoint

DROP TRIGGER IF EXISTS tables_notify ON "tables";--> statement-breakpoint
CREATE TRIGGER tables_notify
  AFTER INSERT OR UPDATE OR DELETE ON "tables"
  FOR EACH ROW EXECUTE FUNCTION tavolo_notify_change();--> statement-breakpoint

DROP TRIGGER IF EXISTS table_blocks_notify ON "table_blocks";--> statement-breakpoint
CREATE TRIGGER table_blocks_notify
  AFTER INSERT OR UPDATE OR DELETE ON "table_blocks"
  FOR EACH ROW EXECUTE FUNCTION tavolo_notify_change();--> statement-breakpoint

DROP TRIGGER IF EXISTS closures_notify ON "closures";--> statement-breakpoint
CREATE TRIGGER closures_notify
  AFTER INSERT OR UPDATE OR DELETE ON "closures"
  FOR EACH ROW EXECUTE FUNCTION tavolo_notify_change();
