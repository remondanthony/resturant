"use server";

import { asc, eq } from "drizzle-orm";
import {
  createReservation,
  findReservationForGuest,
  setReservationStatus,
} from "@/lib/booking/reservations";
import {
  bookableDateRange,
  getAvailableTimesForParty,
  getDayAvailability,
} from "@/lib/booking/availability";
import { getBookingConfig } from "@/lib/booking/config";
import { normalisePhone } from "@/lib/booking/phone";
import { getDb, schema } from "@/lib/db";
import { notifyGuest } from "@/lib/notifications/service";
import { readForm, type FieldRule, type FormState } from "@/lib/forms";

/**
 * Public booking actions.
 *
 * These call the same reservation and availability services the staff
 * dashboard uses — there is one booking engine, not two.
 *
 * Nothing here returns another guest's data, and no action exposes the table
 * list to a normal booking: the guest asks for a time, staff choose where to
 * seat them.
 */

/* ─────────────────────────────────────────────── normal: times only ─────── */

export async function loadAvailableTimes(
  date: string,
  partySize: number,
): Promise<{ closed: { reason: string } | null; times: string[] }> {
  const config = await getBookingConfig();

  if (partySize < config.minPartySize || partySize > config.maxPartySize) {
    return {
      closed: {
        reason: `We seat parties of ${config.minPartySize} to ${config.maxPartySize} online. For anything larger, private dining is the better fit.`,
      },
      times: [],
    };
  }

  try {
    return await getAvailableTimesForParty(date, partySize);
  } catch (error) {
    console.error("[loadAvailableTimes]", error);
    return {
      closed: {
        reason:
          "We can't check availability just now. Please try again in a moment, or call the restaurant and we'll book you in.",
      },
      times: [],
    };
  }
}

/* ──────────────────────────────────── private dining: spaces and times ──── */

export type PrivateSpace = {
  id: string;
  name: string;
  capacity: number;
  location: string;
  times: string[];
};

/**
 * The private dining spaces a party can take on a date, each with the sittings
 * still open. This is the only public surface that names tables — choosing the
 * room is part of the private dining experience.
 */
export async function loadPrivateSpaces(
  date: string,
  partySize: number,
): Promise<{ closed: { reason: string } | null; spaces: PrivateSpace[] }> {
  try {
    const availability = await getDayAvailability(date, partySize);
    if (availability.closed) return { closed: availability.closed, spaces: [] };

    const spaces = availability.tables
      .filter((entry) => entry.table.isPrivateDining)
      .map((entry) => ({
        id: entry.table.id,
        name: entry.table.name,
        capacity: entry.table.capacity,
        location: entry.table.location,
        times: entry.slots.map((slot) => slot.time),
      }));

    return { closed: null, spaces };
  } catch (error) {
    console.error("[loadPrivateSpaces]", error);
    return {
      closed: { reason: "We can't check availability just now. Please try again in a moment." },
      spaces: [],
    };
  }
}

/** Capacity range across the private rooms, for the guest-count control. */
export async function getPrivateDiningRange() {
  const rows = await getDb()
    .select({ capacity: schema.tables.capacity })
    .from(schema.tables)
    .where(eq(schema.tables.isPrivateDining, true))
    .orderBy(asc(schema.tables.capacity));

  const capacities = rows.map((r) => r.capacity);
  return {
    min: capacities.length > 0 ? Math.min(...capacities) : 2,
    max: capacities.length > 0 ? Math.max(...capacities) : 12,
    spaceCount: capacities.length,
  };
}

export async function getBookingWindow() {
  const { min, max, config } = await bookableDateRange();
  return {
    min,
    max,
    minPartySize: config.minPartySize,
    maxPartySize: config.maxPartySize,
  };
}

/* ────────────────────────────────────────────────────────────── booking ─── */

const guestRules: Record<string, FieldRule> = {
  firstName: { label: "First name", required: true, maxLength: 60 },
  lastName: { label: "Last name", required: true, maxLength: 60 },
  phone: { label: "Mobile number", required: true, type: "tel", maxLength: 32 },
  email: { label: "Email", type: "email", maxLength: 120 },
  date: { label: "Date", required: true, type: "date" },
  startTime: { label: "Time", required: true },
  partySize: { label: "Guests", required: true, type: "number", min: 1, max: 40 },
  specialRequests: { label: "Special requests", maxLength: 1000 },
};

async function submit(
  kind: "normal" | "private_dining",
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;
  const rules =
    kind === "private_dining"
      ? { ...guestRules, tableId: { label: "Private room", required: true } }
      : guestRules;

  const { values, errors } = readForm(formData, rules);

  // The mobile number is how the restaurant confirms, so it is stored in one
  // normalised shape whatever the guest typed.
  const phone = normalisePhone(values.phone);
  if (!phone.ok) errors.phone = phone.reason;

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const result = await createReservation(
    {
      tableId: kind === "private_dining" ? values.tableId : null,
      bookingType: kind,
      date: values.date,
      startTime: values.startTime,
      partySize: Number(values.partySize),
      firstName: values.firstName,
      lastName: values.lastName,
      // Email is optional now; the mobile number is the contact of record.
      email: values.email || "",
      phone: phone.ok ? phone.e164 : values.phone,
      specialRequests: values.specialRequests,
    },
    { source: "online" },
  );

  if (!result.ok) {
    return { status: "error", attempt, values, message: result.message };
  }

  // Acknowledge the request. Delivery is best-effort and never affects the
  // booking — a failure is recorded for retry, nothing more.
  await notifyGuest({
    reservationId: result.data.id,
    event: "booking_received",
    recipient: result.data.phone,
    context: {
      guestName: `${result.data.firstName} ${result.data.lastName}`,
      date: result.data.reservationDate,
      startTime: result.data.startTime,
      partySize: result.data.partySize,
      tableName: result.data.table?.name ?? null,
      reservationCode: result.data.reservationCode,
    },
  }).catch((error) => console.error("[booking_received]", error));

  return {
    status: "sent",
    attempt,
    reference: result.data.reservationCode,
    data: {
      date: result.data.reservationDate,
      startTime: result.data.startTime,
      partySize: String(result.data.partySize),
      phone: result.data.phone,
      guestName: result.data.firstName,
      tableName: result.data.table?.name ?? "",
      bookingType: kind,
    },
  };
}

export async function submitBooking(previous: FormState, formData: FormData) {
  return submit("normal", previous, formData);
}

export async function submitPrivateDiningBooking(previous: FormState, formData: FormData) {
  return submit("private_dining", previous, formData);
}

/* ───────────────────────────────────────────────────────── guest lookup ─── */

export async function lookupReservation(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;
  const { values, errors } = readForm(formData, {
    code: { label: "Reservation code", required: true, maxLength: 20 },
    contact: { label: "Mobile number or email", required: true, maxLength: 120 },
  });

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const reservation = await findReservationForGuest(values.code, values.contact);
  if (!reservation) {
    return {
      status: "error",
      attempt,
      values,
      message:
        "We could not find a booking with that code and contact. Check both, or call the restaurant.",
    };
  }

  return {
    status: "sent",
    attempt,
    reference: reservation.reservationCode,
    values,
    // Only this guest's own booking, and only the fields they need to see.
    data: {
      date: reservation.reservationDate,
      startTime: reservation.startTime,
      partySize: String(reservation.partySize),
      tableName: reservation.table?.name ?? "",
      status: reservation.status,
      guestName: `${reservation.firstName} ${reservation.lastName}`,
    },
  };
}

export async function cancelOwnReservation(
  code: string,
  contact: string,
): Promise<{ ok: boolean; message: string }> {
  const reservation = await findReservationForGuest(code, contact);
  if (!reservation) {
    return { ok: false, message: "We could not verify that booking. Please call the restaurant." };
  }
  if (reservation.status === "cancelled") {
    return { ok: true, message: "That booking was already cancelled." };
  }

  const result = await setReservationStatus(reservation.id, "cancelled");
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: "Your reservation has been cancelled." };
}
