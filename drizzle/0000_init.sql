CREATE TYPE "public"."reservation_source" AS ENUM('online', 'staff');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TABLE "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text DEFAULT 'Closed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_code" text NOT NULL,
	"table_id" uuid NOT NULL,
	"reservation_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"party_size" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"special_requests" text,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"source" "reservation_source" DEFAULT 'online' NOT NULL,
	"arrived_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"no_show_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_reservation_code_unique" UNIQUE("reservation_code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"booking_horizon_days" integer DEFAULT 90 NOT NULL,
	"slot_interval_minutes" integer DEFAULT 30 NOT NULL,
	"min_party_size" integer DEFAULT 1 NOT NULL,
	"max_party_size" integer DEFAULT 8 NOT NULL,
	"turn_minutes_small" integer DEFAULT 90 NOT NULL,
	"turn_minutes_medium" integer DEFAULT 120 NOT NULL,
	"turn_minutes_large" integer DEFAULT 150 NOT NULL,
	"last_booking_buffer_minutes" integer DEFAULT 60 NOT NULL,
	"service_hours" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "staff_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"block_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text DEFAULT 'Unavailable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"type" text DEFAULT 'standard' NOT NULL,
	"location" text DEFAULT 'indoor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tables_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_blocks" ADD CONSTRAINT "table_blocks_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "closures_date_idx" ON "closures" USING btree ("closure_date");--> statement-breakpoint
CREATE INDEX "reservations_date_idx" ON "reservations" USING btree ("reservation_date");--> statement-breakpoint
CREATE INDEX "reservations_table_date_idx" ON "reservations" USING btree ("table_id","reservation_date");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_email_idx" ON "reservations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_idx" ON "staff_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "table_blocks_table_date_idx" ON "table_blocks" USING btree ("table_id","block_date");