import { randomInt } from "node:crypto";

/**
 * Human-friendly reservation codes: TAV-8F42K.
 *
 * Crockford-ish alphabet with I, L, O, U and 0/1 removed so a code read down
 * the phone cannot be misheard. Raw database ids are never shown to guests.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateReservationCode(): string {
  let body = "";
  for (let i = 0; i < 5; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `TAV-${body}`;
}

/** Accepts "tav 8f42k", "TAV-8F42K", "8F42K" and normalises to TAV-8F42K. */
export function normaliseReservationCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = cleaned.startsWith("TAV") ? cleaned.slice(3) : cleaned;
  return `TAV-${body}`;
}
