import "server-only";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  defaultBookingConfig,
  parseServiceHours,
  type BookingConfig,
} from "@/lib/booking/config-defaults";

export {
  defaultBookingConfig,
  defaultServiceHours,
  turnMinutes,
  type BookingConfig,
  type ServiceHours,
  type ServiceWindow,
} from "@/lib/booking/config-defaults";

/**
 * Booking rules — one source of truth.
 *
 * Defaults live in config-defaults.ts; the dashboard persists overrides to the
 * settings row. Everything that needs a rule reads `getBookingConfig()`, so
 * customer bookings and staff bookings can never diverge.
 */
export async function getBookingConfig(): Promise<BookingConfig> {
  try {
    const rows = await getDb()
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.id, "default"))
      .limit(1);

    const row = rows[0];
    if (!row) return defaultBookingConfig;

    return {
      bookingHorizonDays: row.bookingHorizonDays,
      slotIntervalMinutes: row.slotIntervalMinutes,
      minPartySize: row.minPartySize,
      maxPartySize: row.maxPartySize,
      turnMinutesSmall: row.turnMinutesSmall,
      turnMinutesMedium: row.turnMinutesMedium,
      turnMinutesLarge: row.turnMinutesLarge,
      lastBookingBufferMinutes: row.lastBookingBufferMinutes,
      serviceHours: parseServiceHours(row.serviceHours),
    };
  } catch {
    return defaultBookingConfig;
  }
}
