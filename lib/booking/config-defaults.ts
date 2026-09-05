/**
 * Booking rule defaults and types.
 *
 * Deliberately free of `server-only` and of any database import so the seed
 * script and the runtime config module can both use it.
 */

/** null = closed that weekday. Keys are JS getDay(): 0 Sunday … 6 Saturday. */
export type ServiceWindow = { open: string; close: string } | null;
export type ServiceHours = Record<number, ServiceWindow>;

export type BookingConfig = {
  bookingHorizonDays: number;
  slotIntervalMinutes: number;
  minPartySize: number;
  maxPartySize: number;
  turnMinutesSmall: number;
  turnMinutesMedium: number;
  turnMinutesLarge: number;
  lastBookingBufferMinutes: number;
  serviceHours: ServiceHours;
};

/** Mirrors the opening hours published on the public site. */
export const defaultServiceHours: ServiceHours = {
  0: { open: "12:00", close: "21:00" }, // Sunday
  1: null, // Monday — closed
  2: { open: "17:30", close: "23:00" },
  3: { open: "17:30", close: "23:00" },
  4: { open: "17:30", close: "23:00" },
  5: { open: "12:00", close: "24:00" }, // Friday, closes at midnight
  6: { open: "12:00", close: "24:00" }, // Saturday
};

export const defaultBookingConfig: BookingConfig = {
  bookingHorizonDays: 90,
  slotIntervalMinutes: 30,
  minPartySize: 1,
  maxPartySize: 8,
  turnMinutesSmall: 90,
  turnMinutesMedium: 120,
  turnMinutesLarge: 150,
  lastBookingBufferMinutes: 60,
  serviceHours: defaultServiceHours,
};

/** How long the table is held, from party size. */
export function turnMinutes(partySize: number, config: BookingConfig): number {
  if (partySize <= 2) return config.turnMinutesSmall;
  if (partySize <= 4) return config.turnMinutesMedium;
  return config.turnMinutesLarge;
}

export function parseServiceHours(raw: string): ServiceHours {
  try {
    const parsed = JSON.parse(raw) as Record<string, ServiceWindow>;
    const hours: ServiceHours = {};
    for (let day = 0; day < 7; day += 1) {
      const entry = parsed[String(day)];
      hours[day] =
        entry && typeof entry.open === "string" && typeof entry.close === "string"
          ? { open: entry.open, close: entry.close }
          : null;
    }
    return hours;
  } catch {
    return defaultServiceHours;
  }
}
