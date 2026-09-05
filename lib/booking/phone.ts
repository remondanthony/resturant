/**
 * Mobile numbers.
 *
 * The mobile number is now the primary way the restaurant reaches a guest, so
 * it is normalised to E.164 on the way in — one stored shape, whatever the
 * guest typed. India is the default country: a bare 10-digit number starting
 * 6–9 is treated as Indian, and other countries work if the guest includes a
 * dialling code.
 */

export const DEFAULT_COUNTRY_CODE = "91";

export type PhoneResult =
  | { ok: true; e164: string }
  | { ok: false; reason: string };

/**
 * Accepts "98765 43210", "+91 98765 43210", "098765-43210", "0091…" and
 * returns "+919876543210".
 */
export function normalisePhone(input: string): PhoneResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "Enter a mobile number." };

  // Keep a leading + as a marker, then reduce to digits.
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  if (!digits) return { ok: false, reason: "Enter a mobile number." };

  // 00 is the international prefix in much of the world.
  if (!hadPlus && digits.startsWith("00")) digits = digits.slice(2);

  if (!hadPlus && !digits.startsWith("00")) {
    // A domestic Indian number, possibly with the trunk 0 or the country code.
    if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
    else if (digits.length === 11 && digits.startsWith("0")) {
      digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
    }
  }

  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    const local = digits.slice(DEFAULT_COUNTRY_CODE.length);
    if (local.length !== 10) {
      return { ok: false, reason: "An Indian mobile number needs 10 digits after +91." };
    }
    if (!/^[6-9]/.test(local)) {
      return { ok: false, reason: "Indian mobile numbers start with 6, 7, 8 or 9." };
    }
    return { ok: true, e164: `+${digits}` };
  }

  // Any other country: accept a plausible international length.
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, reason: "That does not look like a valid mobile number." };
  }
  return { ok: true, e164: `+${digits}` };
}

/** "+919876543210" → "+91 98765 43210" */
export function formatPhone(e164: string): string {
  if (e164.startsWith(`+${DEFAULT_COUNTRY_CODE}`) && e164.length === 13) {
    const local = e164.slice(3);
    return `+${DEFAULT_COUNTRY_CODE} ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return e164;
}

/**
 * "+919876543210" → "+91 98XXXXXX10".
 *
 * Used in lists, where staff only need enough to recognise a caller. The full
 * number stays on the reservation detail page.
 */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 6) return "•••";

  const country = e164.startsWith(`+${DEFAULT_COUNTRY_CODE}`) && e164.length === 13
    ? DEFAULT_COUNTRY_CODE
    : "";
  const local = country ? digits.slice(country.length) : digits;
  const head = local.slice(0, 2);
  const tail = local.slice(-2);
  const hidden = "X".repeat(Math.max(0, local.length - 4));

  return `${country ? `+${country} ` : ""}${head}${hidden}${tail}`;
}
