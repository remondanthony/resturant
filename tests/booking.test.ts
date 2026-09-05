import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  formatTime,
  overlaps,
  toMinutes,
  toTimeString,
} from "../lib/booking/time";
import { generateReservationCode, normaliseReservationCode } from "../lib/booking/code";
import { defaultBookingConfig, turnMinutes } from "../lib/booking/config-defaults";
import { formatPhone, maskPhone, normalisePhone } from "../lib/booking/phone";

/* ─────────────────────────────────────────────────────────────── time ───── */

test("toMinutes and toTimeString round-trip", () => {
  assert.equal(toMinutes("17:30"), 1050);
  assert.equal(toMinutes("00:00"), 0);
  assert.equal(toMinutes("24:00"), 1440);
  assert.equal(toTimeString(1050), "17:30");
  assert.equal(toTimeString(1440), "00:00");
  assert.equal(toTimeString(1470), "00:30");
});

test("formatTime renders a 12-hour clock", () => {
  assert.equal(formatTime("19:00"), "7:00 PM");
  assert.equal(formatTime("00:30"), "12:30 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("17:30:00"), "5:30 PM");
});

test("dayOfWeek is timezone-independent", () => {
  assert.equal(dayOfWeek("2026-09-25"), 5); // a Friday
  assert.equal(dayOfWeek("2026-09-28"), 1); // a Monday
});

test("addDays and daysBetween agree across a month boundary", () => {
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(daysBetween("2026-09-25", "2026-10-05"), 10);
  assert.equal(daysBetween("2026-09-25", "2026-09-24"), -1);
});

test("overlaps is half-open, so back-to-back sittings do not clash", () => {
  // 19:00–21:00 against 21:00–23:00 — the table turns over cleanly.
  assert.equal(overlaps(1140, 1260, 1260, 1380), false);
  // 19:00–21:00 against 20:00–22:00 — a genuine clash.
  assert.equal(overlaps(1140, 1260, 1200, 1320), true);
  // Fully contained.
  assert.equal(overlaps(1140, 1380, 1200, 1260), true);
});

/* ─────────────────────────────────────────────────────── turn times ─────── */

test("turn time grows with party size", () => {
  assert.equal(turnMinutes(1, defaultBookingConfig), 90);
  assert.equal(turnMinutes(2, defaultBookingConfig), 90);
  assert.equal(turnMinutes(3, defaultBookingConfig), 120);
  assert.equal(turnMinutes(4, defaultBookingConfig), 120);
  assert.equal(turnMinutes(5, defaultBookingConfig), 150);
  assert.equal(turnMinutes(8, defaultBookingConfig), 150);
});

/* ────────────────────────────────────────────────── reservation codes ───── */

test("reservation codes look like TAV-XXXXX and avoid ambiguous glyphs", () => {
  for (let i = 0; i < 500; i += 1) {
    const code = generateReservationCode();
    assert.match(code, /^TAV-[2-9A-HJ-NP-TV-Z]{5}$/);
    assert.equal(/[ILOU01]/.test(code.slice(4)), false, `${code} contains an ambiguous character`);
  }
});

test("reservation codes are not obviously colliding", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i += 1) seen.add(generateReservationCode());
  // 30^5 ≈ 24.3M possibilities; 5000 draws should be essentially all distinct.
  assert.ok(seen.size > 4990, `expected near-unique codes, got ${seen.size}`);
});

test("code normalisation accepts what a guest is likely to type", () => {
  assert.equal(normaliseReservationCode("tav-8f42k"), "TAV-8F42K");
  assert.equal(normaliseReservationCode("TAV 8F42K"), "TAV-8F42K");
  assert.equal(normaliseReservationCode("8f42k"), "TAV-8F42K");
  assert.equal(normaliseReservationCode("  TAV8F42K  "), "TAV-8F42K");
});

/* ─────────────────────────────────────────────── slot generation shape ──── */

/** Mirrors the loop in getDayAvailability so the arithmetic is pinned down. */
function slotsFor(open: string, close: string, partySize: number, buffer: number) {
  const config = defaultBookingConfig;
  const start = toMinutes(open);
  const end = toMinutes(close);
  const hold = turnMinutes(partySize, config);
  const slots: string[] = [];
  for (let t = start; t <= end - buffer; t += config.slotIntervalMinutes) {
    if (t + hold > end) continue;
    slots.push(toTimeString(t));
  }
  return slots;
}

test("no sitting is offered that would run past closing", () => {
  // Tuesday: 17:30–23:00, party of 2 (90 min hold), 60 min buffer.
  const slots = slotsFor("17:30", "23:00", 2, 60);
  assert.equal(slots[0], "17:30");
  assert.equal(slots.at(-1), "21:30"); // 21:30 + 90 = 23:00 exactly
  assert.equal(slots.includes("22:00"), false);
});

test("a larger party gets fewer late sittings", () => {
  const small = slotsFor("17:30", "23:00", 2, 60);
  const large = slotsFor("17:30", "23:00", 6, 60);
  assert.ok(large.length < small.length);
  assert.equal(large.at(-1), "20:30"); // 20:30 + 150 = 23:00
});

test("a midnight close is treated as the end of the day, not the start", () => {
  // Friday: 12:00–24:00.
  const slots = slotsFor("12:00", "24:00", 2, 60);
  assert.equal(slots[0], "12:00");
  assert.equal(slots.at(-1), "22:30"); // 22:30 + 90 = 24:00
  assert.ok(slots.length > 20);
});

/* ─────────────────────────────────────────────────── mobile numbers ─────── */

test("Indian mobile numbers normalise to E.164 however they are typed", () => {
  for (const input of [
    "9876543210",
    "98765 43210",
    "+91 98765 43210",
    "098765 43210",
    "0091 9876543210",
    "+919876543210",
  ]) {
    const result = normalisePhone(input);
    assert.equal(result.ok, true, `${input} should be accepted`);
    if (result.ok) assert.equal(result.e164, "+919876543210", `${input} normalised wrongly`);
  }
});

test("international numbers survive if the dialling code is given", () => {
  const result = normalisePhone("+44 20 7946 0182");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.e164, "+442079460182");
});

test("implausible mobile numbers are rejected", () => {
  for (const input of ["", "abc", "12345", "5555555555", "1234567890"]) {
    assert.equal(normalisePhone(input).ok, false, `${input} should be rejected`);
  }
});

test("masking hides the middle but keeps enough to recognise a caller", () => {
  const masked = maskPhone("+919876543210");
  assert.match(masked, /^\+91 98X+10$/);
  assert.equal(masked.includes("76543"), false, "the middle digits must not survive masking");
});

test("display formatting is readable", () => {
  assert.equal(formatPhone("+919876543210"), "+91 98765 43210");
});
