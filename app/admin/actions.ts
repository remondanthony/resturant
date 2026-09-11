"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { requireStaff, UnauthorizedError } from "@/lib/auth/dal";
import { checkRateLimit, clearRateLimit, clientKey } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getDb, schema } from "@/lib/db";
import {
  assignTable as assignTableToReservation,
  cancelReservation,
  createReservation,
  getReservationById,
  setReservationStatus,
  updateReservation,
} from "@/lib/booking/reservations";
import { getDayAvailability } from "@/lib/booking/availability";
import {
  adjustTimer,
  cancelTimerForReservation,
  completeTimer,
  getTimerForReservation,
  markReady,
  pauseTimer,
  resumeTimer,
  startTimer,
} from "@/lib/prep-timer/service";
import type { PrepTimerView } from "@/lib/prep-timer/types";
import { sendConfirmationEmail } from "@/lib/notifications/service";
import { retryNotification } from "@/lib/notifications/service";
import { readForm, type FieldRule, type FormState } from "@/lib/forms";
import { defaultBookingConfig } from "@/lib/booking/config-defaults";
import { pgError, UNIQUE_VIOLATION } from "@/lib/db/errors";
import type { ReservationStatus } from "@/lib/db/schema";

/**
 * Staff mutations.
 *
 * Every export here calls `requireStaff()` before doing anything. Hiding a
 * button in the UI is not access control — a hand-rolled POST to any of these
 * is refused the same way.
 */

export type ActionResult = { ok: boolean; message: string };

/** Wraps an action so an unauthenticated call fails loudly and safely. */
async function guarded<T>(run: () => Promise<T>, fallback: string): Promise<T | ActionResult> {
  try {
    await requireStaff();
    return await run();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: "Your session has expired. Please sign in again." };
    }
    console.error("[admin]", error);
    return { ok: false, message: fallback };
  }
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/* ────────────────────────────────────────────────────────────────── auth ─── */

export async function signIn(previous: FormState, formData: FormData): Promise<FormState> {
  const attempt = previous.attempt + 1;
  const { values, errors } = readForm(formData, {
    email: { label: "Email", required: true, type: "email", maxLength: 120 },
    password: { label: "Password", required: true, maxLength: 200 },
  });

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values: { email: values.email } };
  }

  const email = values.email.toLowerCase();
  const limitKeys = [`ip:${clientKey(await headers())}`, `email:${email}`];

  const limit = checkRateLimit(limitKeys);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      status: "error",
      attempt,
      values: { email: values.email },
      message: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const rows = await getDb()
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.email, email))
      .limit(1);

    const user = rows[0];
    // Same message and roughly the same work whether the email exists or not.
    const valid = user ? await verifyPassword(values.password, user.passwordHash) : false;

    if (!user || !valid || !user.isActive) {
      return {
        status: "error",
        attempt,
        values: { email: values.email },
        message: "That email and password do not match a staff account.",
      };
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    clearRateLimit(limitKeys);

    await getDb()
      .update(schema.staffUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.staffUsers.id, user.id));

    return { status: "sent", attempt };
  } catch (error) {
    console.error("[signIn]", error);
    return {
      status: "error",
      attempt,
      values: { email: values.email },
      message: "We could not sign you in just now. Please try again.",
    };
  }
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ────────────────────────────────────────────────────── reservation status ─ */

export async function changeReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<ActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result =
      status === "cancelled" ? await cancelReservation(id) : await setReservationStatus(id, status);
    if (!result.ok) return { ok: false, message: result.message };

    // A booking that has ended must not leave a timer running behind it, or
    // the kitchen keeps being told an order is late that nobody is waiting for.
    if (status === "cancelled" || status === "no_show") {
      await cancelTimerForReservation(id, { staffUserId: staff.id });
    } else if (status === "completed") {
      await completeTimer(id, { staffUserId: staff.id });
    }

    // Re-renders every admin view from the database; the realtime trigger
    // carries the same change to any other dashboard that is open.
    refreshAdmin();
    // Confirming is the moment the guest is told; other transitions are internal.
    if (status === "confirmed") await sendConfirmation(id);
    return { ok: true, message: STATUS_MESSAGES[status] ?? "Reservation updated." };
  }, "We couldn't update this reservation. Please try again.") as Promise<ActionResult>;
}

/**
 * Every status change goes through one action, so the transition rules live in
 * a single place and the database is updated the same way whatever view the
 * staff member is looking at.
 */
const STATUS_MESSAGES: Partial<Record<ReservationStatus, string>> = {
  seated: "Guest seated.",
  completed: "Reservation completed.",
  no_show: "Marked as a no show.",
  cancelled: "Reservation cancelled.",
  confirmed: "Reservation reinstated.",
};

/**
 * Sends the guest their confirmation email.
 *
 * Goes to the guest's email address, not their phone: this is the confirmation
 * that the table is held, and it is the one message this application actually
 * delivers.
 *
 * Never allowed to fail the caller. By the time this runs the table is
 * assigned and the booking is confirmed in the database; a delivery problem is
 * recorded against the notification row for retry and nothing more. The
 * dashboard must not tell staff the assignment failed because an email did.
 *
 * Calling it twice is safe — the unique index means the second attempt sends
 * nothing and reports a duplicate.
 */
async function sendConfirmation(reservationId: string) {
  try {
    const outcome = await sendConfirmationEmail(reservationId);
    if (outcome.status === "failed") {
      // The reason, never the guest's address or any key.
      console.error("[sendConfirmation] delivery failed:", outcome.reason ?? "unknown");
    }
  } catch (error) {
    console.error("[sendConfirmation]", error);
  }
}

/** Tables that could actually take this booking, for the assignment screen. */
export async function loadAssignableTables(reservationId: string) {
  await requireStaff();

  const reservation = await getReservationById(reservationId);
  if (!reservation) return { tables: [], closed: null as { reason: string } | null };

  const availability = await getDayAvailability(
    reservation.reservationDate,
    reservation.partySize,
    { excludeReservationId: reservationId, ignoreLeadTime: true },
  );

  const wanted = reservation.startTime.slice(0, 5);

  return {
    closed: availability.closed,
    tables: availability.tables.map((entry) => ({
      id: entry.table.id,
      name: entry.table.name,
      capacity: entry.table.capacity,
      type: entry.table.type,
      location: entry.table.location,
      // Free at this booking's own time, rather than merely free that day.
      availableAtTime: entry.slots.some((slot) => slot.time === wanted),
    })),
  };
}

/**
 * Assigns a table and confirms the booking, then notifies the guest.
 * Availability is re-checked inside the service, and the database exclusion
 * constraint is the final backstop against two staff assigning at once.
 */
export async function assignTable(reservationId: string, tableId: string): Promise<ActionResult> {
  return guarded(async () => {
    const result = await assignTableToReservation(reservationId, tableId);
    if (!result.ok) return { ok: false, message: result.message };

    refreshAdmin();
    await sendConfirmation(reservationId);

    return { ok: true, message: `Assigned ${result.data.table?.name ?? "table"} and confirmed.` };
  }, "We couldn't assign that table. Please try again.") as Promise<ActionResult>;
}

/** Retries a message that failed to send. */
export async function resendNotification(notificationId: string): Promise<ActionResult> {
  return guarded(async () => {
    const outcome = await retryNotification(notificationId);
    if (!outcome) return { ok: false, message: "That notification no longer exists." };
    if (outcome.status === "failed") {
      return { ok: false, message: "Delivery failed again. The booking is unaffected." };
    }
    refreshAdmin();
    return {
      ok: true,
      message:
        outcome.status === "simulated"
          ? "Simulated — no messaging provider is configured."
          : "Message sent.",
    };
  }, "We couldn't resend that message. Please try again.") as Promise<ActionResult>;
}

/* ───────────────────────────────────────────────── reservation create/edit ─ */

const reservationRules: Record<string, FieldRule> = {
  firstName: { label: "First name", required: true, maxLength: 60 },
  lastName: { label: "Last name", required: true, maxLength: 60 },
  email: { label: "Email", required: true, type: "email", maxLength: 120 },
  phone: { label: "Phone", required: true, type: "tel", maxLength: 32 },
  date: { label: "Date", required: true },
  startTime: { label: "Time", required: true },
  partySize: { label: "Guests", required: true, type: "number", min: 1, max: 200 },
  tableId: { label: "Table", required: true },
  specialRequests: { label: "Special requests", maxLength: 1000 },
};

/** Staff booking. Goes through exactly the same service as a customer booking. */
export async function createStaffReservation(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, reservationRules);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const result = await createReservation(
    {
      tableId: values.tableId,
      date: values.date,
      startTime: values.startTime,
      partySize: Number(values.partySize),
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      specialRequests: values.specialRequests,
    },
    { source: "staff" },
  );

  if (!result.ok) {
    return { status: "error", attempt, values, message: result.message };
  }

  refreshAdmin();
  redirect(`/admin/reservations/${result.data.id}?created=1`);
}

export async function editReservation(
  reservationId: string,
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, reservationRules);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  // Staff may move a booking within the current service, so past times are allowed.
  const result = await updateReservation(
    reservationId,
    {
      tableId: values.tableId,
      date: values.date,
      startTime: values.startTime,
      partySize: Number(values.partySize),
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      specialRequests: values.specialRequests,
    },
    { allowPastTimes: true },
  );

  if (!result.ok) {
    return { status: "error", attempt, values, message: result.message };
  }

  refreshAdmin();
  redirect(`/admin/reservations/${reservationId}?updated=1`);
}

/* ───────────────────────────────────────────────────────────────── tables ── */

const tableRules: Record<string, FieldRule> = {
  name: { label: "Table name", required: true, maxLength: 40 },
  capacity: { label: "Capacity", required: true, type: "number", min: 1, max: 40 },
  type: { label: "Type", required: true, maxLength: 40 },
  location: { label: "Location", required: true, maxLength: 40 },
  sortOrder: { label: "Order", type: "number", min: 0, max: 999 },
};

export async function saveTable(
  tableId: string | null,
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, tableRules);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const payload = {
    name: values.name,
    capacity: Number(values.capacity),
    type: values.type.toLowerCase(),
    location: values.location,
    sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
    isActive: formData.get("isActive") === "on",
    updatedAt: new Date(),
  };

  try {
    const db = getDb();
    if (tableId) {
      await db.update(schema.tables).set(payload).where(eq(schema.tables.id, tableId));
    } else {
      await db.insert(schema.tables).values(payload);
    }
  } catch (error) {
    const duplicate = pgError(error).code === UNIQUE_VIOLATION;
    console.error("[saveTable]", error);
    return {
      status: "error",
      attempt,
      values,
      message: duplicate
        ? `A table called "${values.name}" already exists.`
        : "Unable to save table changes. Please try again.",
    };
  }

  refreshAdmin();
  redirect("/admin/tables?saved=1");
}

export async function setTableActive(tableId: string, isActive: boolean): Promise<ActionResult> {
  return guarded(async () => {
    await getDb()
      .update(schema.tables)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.tables.id, tableId));
    refreshAdmin();
    return { ok: true, message: isActive ? "Table back in service." : "Table taken out of service." };
  }, "Unable to save table changes. Please try again.") as Promise<ActionResult>;
}

/* ─────────────────────────────────────────────────────────── availability ── */

export async function blockTable(previous: FormState, formData: FormData): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, {
    tableId: { label: "Table", required: true },
    blockDate: { label: "Date", required: true, type: "date" },
    reason: { label: "Reason", maxLength: 120 },
  });
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const allDay = formData.get("allDay") === "on";
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!allDay && (!startTime || !endTime)) {
    return {
      status: "invalid",
      attempt,
      values,
      errors: { startTime: "Give a start and end time, or block the whole day." },
    };
  }
  if (!allDay && endTime <= startTime) {
    return { status: "invalid", attempt, values, errors: { endTime: "End must be after start." } };
  }

  try {
    await getDb().insert(schema.tableBlocks).values({
      tableId: values.tableId,
      blockDate: values.blockDate,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      reason: values.reason || "Unavailable",
    });
  } catch (error) {
    console.error("[blockTable]", error);
    return { status: "error", attempt, values, message: "Unable to block this table. Please try again." };
  }

  refreshAdmin();
  return { status: "sent", attempt };
}

export async function removeTableBlock(blockId: string): Promise<ActionResult> {
  return guarded(async () => {
    await getDb().delete(schema.tableBlocks).where(eq(schema.tableBlocks.id, blockId));
    refreshAdmin();
    return { ok: true, message: "Block removed." };
  }, "Unable to remove this block. Please try again.") as Promise<ActionResult>;
}

export async function addClosure(previous: FormState, formData: FormData): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, {
    closureDate: { label: "Date", required: true, type: "date" },
    reason: { label: "Reason", maxLength: 120 },
  });
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const allDay = formData.get("allDay") === "on";
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!allDay && (!startTime || !endTime)) {
    return {
      status: "invalid",
      attempt,
      values,
      errors: { startTime: "Give a start and end time, or close the whole day." },
    };
  }
  if (!allDay && endTime <= startTime) {
    return { status: "invalid", attempt, values, errors: { endTime: "End must be after start." } };
  }

  try {
    await getDb().insert(schema.closures).values({
      closureDate: values.closureDate,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      reason: values.reason || (allDay ? "Closed" : "Private event"),
    });
  } catch (error) {
    console.error("[addClosure]", error);
    return { status: "error", attempt, values, message: "Unable to save this closure. Please try again." };
  }

  refreshAdmin();
  return { status: "sent", attempt };
}

export async function removeClosure(closureId: string): Promise<ActionResult> {
  return guarded(async () => {
    await getDb().delete(schema.closures).where(eq(schema.closures.id, closureId));
    refreshAdmin();
    return { ok: true, message: "Closure removed." };
  }, "Unable to remove this closure. Please try again.") as Promise<ActionResult>;
}

/* ───────────────────────────────────────────────────────────────── settings ─ */

export async function saveSettings(previous: FormState, formData: FormData): Promise<FormState> {
  const attempt = previous.attempt + 1;

  try {
    await requireStaff();
  } catch {
    return { status: "error", attempt, message: "Your session has expired. Please sign in again." };
  }

  const { values, errors } = readForm(formData, {
    bookingHorizonDays: { label: "Booking window", required: true, type: "number", min: 1, max: 365 },
    slotIntervalMinutes: { label: "Time-slot interval", required: true, type: "number", min: 5, max: 120 },
    minPartySize: { label: "Minimum party size", required: true, type: "number", min: 1, max: 20 },
    maxPartySize: { label: "Maximum party size", required: true, type: "number", min: 1, max: 40 },
    turnMinutesSmall: { label: "Duration, 1–2 guests", required: true, type: "number", min: 30, max: 360 },
    turnMinutesMedium: { label: "Duration, 3–4 guests", required: true, type: "number", min: 30, max: 360 },
    turnMinutesLarge: { label: "Duration, 5+ guests", required: true, type: "number", min: 30, max: 360 },
    lastBookingBufferMinutes: { label: "Last booking buffer", required: true, type: "number", min: 0, max: 240 },
  });

  if (Number(values.minPartySize) > Number(values.maxPartySize)) {
    errors.minPartySize = "Minimum cannot be greater than maximum.";
  }
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  // Seven weekday windows, each open/close or closed.
  const serviceHours: Record<number, { open: string; close: string } | null> = {};
  for (let day = 0; day < 7; day += 1) {
    const closed = formData.get(`closed-${day}`) === "on";
    const open = String(formData.get(`open-${day}`) ?? "");
    const close = String(formData.get(`close-${day}`) ?? "");
    if (closed || !open || !close) {
      serviceHours[day] = null;
    } else if (close <= open && close !== "00:00") {
      return {
        status: "invalid",
        attempt,
        values,
        errors: { [`close-${day}`]: "Closing time must be after opening time." },
      };
    } else {
      // Midnight entered as 00:00 means the end of that day.
      serviceHours[day] = { open, close: close === "00:00" ? "24:00" : close };
    }
  }

  try {
    const payload = {
      bookingHorizonDays: Number(values.bookingHorizonDays),
      slotIntervalMinutes: Number(values.slotIntervalMinutes),
      minPartySize: Number(values.minPartySize),
      maxPartySize: Number(values.maxPartySize),
      turnMinutesSmall: Number(values.turnMinutesSmall),
      turnMinutesMedium: Number(values.turnMinutesMedium),
      turnMinutesLarge: Number(values.turnMinutesLarge),
      lastBookingBufferMinutes: Number(values.lastBookingBufferMinutes),
      serviceHours: JSON.stringify(serviceHours),
      updatedAt: new Date(),
    };

    const db = getDb();
    const existing = await db
      .select({ id: schema.settings.id })
      .from(schema.settings)
      .where(eq(schema.settings.id, "default"))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.settings).set(payload).where(eq(schema.settings.id, "default"));
    } else {
      await db.insert(schema.settings).values({ id: "default", ...defaultBookingConfig, ...payload });
    }
  } catch (error) {
    console.error("[saveSettings]", error);
    return { status: "error", attempt, values, message: "Unable to save settings. Please try again." };
  }

  revalidatePath("/", "layout");
  return { status: "sent", attempt };
}

/* ─────────────────────────────────────────────────── preparation timers ─── */

/**
 * Kitchen timer controls.
 *
 * All of them go through `guarded`, so an unauthenticated POST straight at the
 * endpoint is refused exactly like every other staff mutation. The reservation
 * id is the only thing the browser supplies — never a remaining time, an end
 * time or a timer id, because those are the server's to decide.
 */

export type TimerActionResult = ActionResult & { timer?: PrepTimerView };

/** The current timer for a booking. Settles any overrun before answering. */
export async function loadPrepTimer(reservationId: string): Promise<PrepTimerView | null> {
  await requireStaff();
  return getTimerForReservation(reservationId);
}

export async function startPrepTimer(
  reservationId: string,
  minutes: number,
): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await startTimer(reservationId, minutes, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    return { ok: true, message: `Preparation started — ${minutes} minutes.`, timer: result.data };
  }, "We couldn't start the timer. Please try again.") as Promise<TimerActionResult>;
}

export async function adjustPrepTimer(
  reservationId: string,
  minutes: number,
): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await adjustTimer(reservationId, minutes, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    const sign = minutes > 0 ? "Added" : "Removed";
    return {
      ok: true,
      message: `${sign} ${Math.abs(minutes)} minutes.`,
      timer: result.data,
    };
  }, "We couldn't change the timer. Please try again.") as Promise<TimerActionResult>;
}

export async function pausePrepTimer(reservationId: string): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await pauseTimer(reservationId, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    return { ok: true, message: "Preparation paused.", timer: result.data };
  }, "We couldn't pause the timer. Please try again.") as Promise<TimerActionResult>;
}

export async function resumePrepTimer(reservationId: string): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await resumeTimer(reservationId, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    return { ok: true, message: "Preparation resumed.", timer: result.data };
  }, "We couldn't resume the timer. Please try again.") as Promise<TimerActionResult>;
}

export async function markPrepReady(reservationId: string): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await markReady(reservationId, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    return { ok: true, message: "Order marked ready.", timer: result.data };
  }, "We couldn't mark this ready. Please try again.") as Promise<TimerActionResult>;
}

export async function completePrepTimer(reservationId: string): Promise<TimerActionResult> {
  return guarded(async () => {
    const staff = await requireStaff();
    const result = await completeTimer(reservationId, { staffUserId: staff.id });
    if (!result.ok) return { ok: false, message: result.message };
    refreshAdmin();
    return { ok: true, message: "Preparation completed.", timer: result.data };
  }, "We couldn't complete this. Please try again.") as Promise<TimerActionResult>;
}

/* ───────────────────────────────────────────────────────── lookup helpers ── */

/**
 * Availability for the staff booking form, resolved through the shared engine.
 * There is no admin-specific availability calculation.
 */
export async function loadAvailability(
  date: string,
  partySize: number,
  excludeReservationId?: string,
) {
  await requireStaff();
  const { getDayAvailability } = await import("@/lib/booking/availability");

  let availability;
  try {
    availability = await getDayAvailability(date, partySize, {
      excludeReservationId,
      // Staff take walk-ins for the sitting that is already running.
      ignoreLeadTime: true,
    });
  } catch (error) {
    console.error("[loadAvailability]", error);
    return {
      closed: { reason: "Unable to check availability just now. Please try again." },
      tables: [],
    };
  }

  return {
    closed: availability.closed,
    tables: availability.tables.map((entry) => ({
      id: entry.table.id,
      name: entry.table.name,
      capacity: entry.table.capacity,
      type: entry.table.type,
      location: entry.table.location,
      slots: entry.slots.map((slot) => slot.time),
    })),
  };
}

/** Tables that can seat a party, for the staff booking form. */
export async function getSelectableTables(partySize: number) {
  await requireStaff();
  return getDb()
    .select()
    .from(schema.tables)
    .where(and(eq(schema.tables.isActive, true)))
    .orderBy(asc(schema.tables.sortOrder))
    .then((rows) => rows.filter((t) => t.capacity >= partySize));
}
