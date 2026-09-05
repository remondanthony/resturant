/**
 * Wall-clock helpers. The restaurant thinks in local time, so everything here
 * works in plain "HH:mm" strings and "YYYY-MM-DD" dates with no timezone maths.
 *
 * Minutes-from-midnight may exceed 1440 to express a closing time after
 * midnight (Friday's "24:00" is 1440).
 */

export const RESTAURANT_TIME_ZONE = "Europe/London";

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export function toTimeString(minutes: number): string {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalised / 60);
  const m = normalised % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "17:30" → "5:30 PM" */
export function formatTime(time: string): string {
  const minutes = toMinutes(time.slice(0, 5));
  const normalised = minutes % 1440;
  const h24 = Math.floor(normalised / 60);
  const m = normalised % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Today in the restaurant's timezone, as YYYY-MM-DD. */
export function restaurantToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current wall-clock time in the restaurant's timezone, as minutes from midnight. */
export function restaurantNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return toMinutes(parts);
}

/** Weekday index (0 Sunday) for a YYYY-MM-DD string, timezone-independent. */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

/** "2026-09-25" → "Friday, 25 September 2026" */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "2026-09-25" → "Fri 25 Sep" */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Do [aStart, aEnd) and [bStart, bEnd) overlap? Minutes from midnight. */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
