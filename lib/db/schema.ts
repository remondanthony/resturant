import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * TAVOLO schema.
 *
 * One set of tables serves both the customer booking flow and the staff
 * dashboard — there is no separate admin data model.
 */

export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "no_show",
  "cancelled",
]);

/** Where a booking came from. Staff care whether it arrived by phone or online. */
export const reservationSource = pgEnum("reservation_source", ["online", "staff"]);

export const staffRole = pgEnum("staff_role", ["owner", "staff"]);

/**
 * How the booking was made, which decides who picks the table.
 * `normal` — the guest asks for a time; staff assign a table afterwards.
 * `private_dining` — the guest chooses the space themselves.
 */
export const bookingType = pgEnum("booking_type", ["normal", "private_dining"]);

export const notificationEvent = pgEnum("notification_event", [
  "booking_received",
  "booking_confirmed",
  "booking_modified",
  "booking_cancelled",
  "booking_completed",
]);

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  /** Delivered by the mock provider — nothing actually left the building. */
  "simulated",
  "failed",
]);

/**
 * Food preparation, which is a different axis from the booking's own lifecycle.
 * A guest can be `seated` while their order is `preparing`, so this never
 * touches `reservation_status`.
 *
 * There is no NOT_STARTED member: a reservation with no timer row has not
 * started one. Adding a state to mean "no row" would put the same fact in two
 * places.
 *
 * `delayed` is what `preparing` becomes once the kitchen has run over and the
 * server has added its automatic ten minutes.
 */
export const prepTimerStatus = pgEnum("prep_timer_status", [
  "preparing",
  "paused",
  "delayed",
  "ready",
  "completed",
  "cancelled",
]);

/** One line of the timer's history. `auto_extended` is written by the server. */
export const prepTimerEventType = pgEnum("prep_timer_event_type", [
  "started",
  "paused",
  "resumed",
  "extended",
  "reduced",
  "auto_extended",
  "ready",
  "completed",
  "cancelled",
]);

/* ───────────────────────────────────────────────────────────── tables ───── */

export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  capacity: integer("capacity").notNull(),
  /** Free text, not an enum — staff can rename and add types without a migration. */
  type: text("type").notNull().default("standard"),
  location: text("location").notNull().default("indoor"),
  isActive: boolean("is_active").notNull().default(true),
  /** Offered to guests on the private dining page. */
  isPrivateDining: boolean("is_private_dining").notNull().default(false),
  /** Display order in the floor plan and lists. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────── reservations ───── */

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human-facing code, e.g. TAV-8F42K. Never expose the uuid to guests. */
    reservationCode: text("reservation_code").notNull().unique(),

    /**
     * Null until a table is assigned. Normal bookings arrive unassigned and
     * staff choose the table; private dining bookings carry the guest's own
     * choice from the moment they are created.
     */
    tableId: uuid("table_id").references(() => tables.id, { onDelete: "restrict" }),

    bookingType: bookingType("booking_type").notNull().default("normal"),

    reservationDate: date("reservation_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),

    partySize: integer("party_size").notNull(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    specialRequests: text("special_requests"),

    status: reservationStatus("status").notNull().default("confirmed"),
    source: reservationSource("source").notNull().default("online"),

    /* Lifecycle timestamps, for audit only. The canonical state of a booking
       is `status` and nothing else — a seated guest has status `seated`. These
       record when each transition happened. */
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    noShowAt: timestamp("no_show_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reservations_date_idx").on(t.reservationDate),
    index("reservations_table_date_idx").on(t.tableId, t.reservationDate),
    index("reservations_status_idx").on(t.status),
    index("reservations_email_idx").on(t.email),
  ],
);

/* ──────────────────────────────────────────────────────── table blocks ───── */

/**
 * Takes a single table out of service for a date, or part of one. Tables are
 * never deleted to make them unavailable.
 */
export const tableBlocks = pgTable(
  "table_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    blockDate: date("block_date").notNull(),
    /** Null start and end means the whole service that day. */
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason").notNull().default("Unavailable"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("table_blocks_table_date_idx").on(t.tableId, t.blockDate)],
);

/* ──────────────────────────────────────────────────────────── closures ───── */

/**
 * Closes the whole restaurant for a date, or blocks a period of one (a private
 * event, a late opening). Customer availability respects these.
 */
export const closures = pgTable(
  "closures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    closureDate: date("closure_date").notNull(),
    /** Null start and end means closed all day. */
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason").notNull().default("Closed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("closures_date_idx").on(t.closureDate)],
);

/* ──────────────────────────────────────────────────────────── settings ───── */

/**
 * Booking rules, editable from the dashboard. A single row, id "default".
 * `lib/booking/config.ts` reads this and falls back to code defaults, so the
 * rules live in one place rather than two.
 */
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  /** How many days ahead guests may book. */
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(90),
  /** Minutes between offered sittings. */
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  minPartySize: integer("min_party_size").notNull().default(1),
  maxPartySize: integer("max_party_size").notNull().default(8),
  /** How long a table is held, by party size. */
  turnMinutesSmall: integer("turn_minutes_small").notNull().default(90),
  turnMinutesMedium: integer("turn_minutes_medium").notNull().default(120),
  turnMinutesLarge: integer("turn_minutes_large").notNull().default(150),
  /** Minutes before closing after which today can no longer be booked. */
  lastBookingBufferMinutes: integer("last_booking_buffer_minutes").notNull().default(60),
  /**
   * Weekly service windows as JSON: seven entries keyed 0 (Sunday) to 6, each
   * either null (closed) or { open: "17:30", close: "23:00" }.
   */
  serviceHours: text("service_hours").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────── staff ───────── */

export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** scrypt, never plaintext. See lib/auth/password.ts. */
    passwordHash: text("password_hash").notNull(),
    role: staffRole("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("staff_users_email_idx").on(t.email)],
);

/**
 * One outbound message attempt. Kept separate from the reservation so a failed
 * send is recorded and retryable without ever touching the booking's status.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id").references(() => reservations.id, {
      onDelete: "cascade",
    }),
    event: notificationEvent("event").notNull(),
    channel: text("channel").notNull().default("sms"),
    /** Normalised destination, e.g. +919812345678. */
    recipient: text("recipient").notNull(),
    message: text("message").notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    provider: text("provider"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_reservation_idx").on(t.reservationId),
    index("notifications_status_idx").on(t.status),
  ],
);

/* ────────────────────────────────────────────────────── preparation ─────── */

/**
 * A food preparation timer for one booking.
 *
 * The row is the timer. `endsAt` is the only thing that decides how much time
 * is left, so a browser that refreshes, sleeps or is closed entirely has no
 * effect on it, and every device reading the row agrees.
 *
 * There is deliberately no `tableId` here. The table already belongs to the
 * reservation, and copying it would only create a second answer to drift from
 * the first when staff move a guest. Views read the reservation's table.
 */
export const prepTimers = pgTable(
  "prep_timers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),

    status: prepTimerStatus("status").notNull().default("preparing"),

    /** What the kitchen was originally asked for, kept for reporting. */
    originalDurationMinutes: integer("original_duration_minutes").notNull(),

    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** The authority on remaining time. Null only while paused or finished. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** What was left when staff paused, so resuming does not lose it. */
    remainingMsAtPause: integer("remaining_ms_at_pause"),

    /** Manual adjustments by staff, and the server's own additions. Separate
        counters because one is a decision and the other is an overrun. */
    extensionCount: integer("extension_count").notNull().default(0),
    autoExtensionCount: integer("auto_extension_count").notNull().default(0),

    readyAt: timestamp("ready_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("prep_timers_reservation_idx").on(t.reservationId),
    index("prep_timers_status_idx").on(t.status),
  ],
);

/**
 * The timer's history, so staff can see what happened rather than infer it.
 * `staffUserId` is null for the server's automatic extension — nobody pressed
 * anything, and recording a person would be a lie.
 */
export const prepTimerEvents = pgTable(
  "prep_timer_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    timerId: uuid("timer_id")
      .notNull()
      .references(() => prepTimers.id, { onDelete: "cascade" }),
    event: prepTimerEventType("event").notNull(),
    /** Signed, for the adjustment events. Null for the rest. */
    deltaMinutes: integer("delta_minutes"),
    staffUserId: uuid("staff_user_id").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prep_timer_events_timer_idx").on(t.timerId)],
);

export type TableRow = typeof tables.$inferSelect;
export type NewTableRow = typeof tables.$inferInsert;
export type ReservationRow = typeof reservations.$inferSelect;
export type TableBlockRow = typeof tableBlocks.$inferSelect;
export type ClosureRow = typeof closures.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type StaffUserRow = typeof staffUsers.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type PrepTimerRow = typeof prepTimers.$inferSelect;
export type PrepTimerEventRow = typeof prepTimerEvents.$inferSelect;
export type PrepTimerStatus = (typeof prepTimerStatus.enumValues)[number];
export type PrepTimerEventType = (typeof prepTimerEventType.enumValues)[number];
export type ReservationStatus = (typeof reservationStatus.enumValues)[number];
export type BookingType = (typeof bookingType.enumValues)[number];
export type NotificationEvent = (typeof notificationEvent.enumValues)[number];
