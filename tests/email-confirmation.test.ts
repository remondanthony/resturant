import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildConfirmationEmail,
  confirmationIdempotencyKey,
  CONFIRMATION_FROM,
  escapeHtml,
  redactEmail,
  type ConfirmationEmailContext,
} from "../lib/notifications/email-templates";

/**
 * Confirmation email content and the rules around it.
 *
 * The delivery guarantees — one email per booking, a failure never touching
 * the reservation — need a database and live in
 * tests/email-confirmation-integration.mts.
 */

function context(over: Partial<ConfirmationEmailContext> = {}): ConfirmationEmailContext {
  return {
    firstName: "John",
    lastName: "Whitfield",
    reservationCode: "TAV-8F42K",
    date: "2026-09-20",
    startTime: "19:30",
    partySize: 4,
    tableName: "Table 12",
    specialRequests: null,
    ...over,
  };
}

/* ─────────────────────────────────────────────────────────── content ────── */

test("the email carries everything a guest needs", () => {
  const { html, text, subject } = buildConfirmationEmail(context());

  for (const expected of ["John", "Whitfield", "TAV-8F42K", "Table 12"]) {
    assert.ok(html.includes(expected), `html is missing ${expected}`);
    assert.ok(text.includes(expected), `text is missing ${expected}`);
  }

  // Date, time and guest count, in the forms the rest of the site uses.
  assert.match(html, /20 September 2026/);
  assert.match(html, /7:30\s*PM/i);
  assert.match(html, /4 guests/);
  assert.match(text, /20 September 2026/);
  assert.match(text, /7:30\s*PM/i);
  assert.match(text, /4 guests/);

  assert.match(subject, /confirmed/i);
});

test("it states plainly that the table is confirmed", () => {
  const { html, text, subject } = buildConfirmationEmail(context());
  assert.match(html, /Reservation confirmed/i);
  assert.match(html, /Your table is confirmed/i);
  assert.match(text, /Your table is confirmed/i);
  assert.match(subject, /Your table is confirmed/i);
});

test("nothing in it implies the booking is still a request", () => {
  const { html, text, subject } = buildConfirmationEmail(
    context({ specialRequests: "Window table if possible" }),
  );

  // "request" appears only as the guest's own note heading, never about the
  // state of the booking.
  for (const phrase of [
    /we.{0,3}ll confirm/i,
    /will be confirmed/i,
    /pending/i,
    /awaiting/i,
    /shortly/i,
    /once we have/i,
  ]) {
    assert.doesNotMatch(html, phrase, `html must not say ${phrase}`);
    assert.doesNotMatch(text, phrase, `text must not say ${phrase}`);
    assert.doesNotMatch(subject, phrase, `subject must not say ${phrase}`);
  }
});

test("branding and a professional closing are present", () => {
  const { html, text } = buildConfirmationEmail(context());
  assert.ok(html.includes("TAVOLO"), "the wordmark must appear");
  assert.match(html, /With warm regards/i);
  assert.match(html, /The TAVOLO team/);
  assert.match(text, /With warm regards/i);
  // Contact details in the footer, so a guest can reach the restaurant.
  assert.match(html, /\+44 20 7946 0182/);
});

test("a special request is shown when there is one, and omitted when there is not", () => {
  const withNote = buildConfirmationEmail(context({ specialRequests: "Anniversary dinner" }));
  assert.match(withNote.html, /Your note to us/i);
  assert.ok(withNote.html.includes("Anniversary dinner"));
  assert.ok(withNote.text.includes("Anniversary dinner"));

  const without = buildConfirmationEmail(context({ specialRequests: null }));
  assert.doesNotMatch(without.html, /Your note to us/i);

  // Whitespace is not a note.
  const blank = buildConfirmationEmail(context({ specialRequests: "   " }));
  assert.doesNotMatch(blank.html, /Your note to us/i);
});

test("a booking with no table assigned still reads correctly", () => {
  // Should not happen — the email is sent on assignment — but it must not
  // produce "Table null" if it ever does.
  const { html, text } = buildConfirmationEmail(context({ tableName: null }));
  assert.doesNotMatch(html, /null|undefined/);
  assert.doesNotMatch(text, /null|undefined/);
  assert.doesNotMatch(text, /^Table:/m);
});

test("one guest is not called 'guests'", () => {
  const { text } = buildConfirmationEmail(context({ partySize: 1 }));
  assert.match(text, /1 guest\b/);
  assert.doesNotMatch(text, /1 guests/);
});

test("a plain-text fallback exists and carries no markup", () => {
  const { text } = buildConfirmationEmail(context({ specialRequests: "No nuts please" }));
  assert.ok(text.length > 100, "the text part must be a real message");
  assert.doesNotMatch(text, /<[a-z/]/i, "the text part must contain no tags");
  assert.doesNotMatch(text, /&(amp|lt|gt|quot|#39);/, "and no HTML entities");
});

/* ──────────────────────────────────────────────────────────── safety ────── */

test("guest text is escaped, so a booking cannot inject markup", () => {
  const nasty = `<script>alert("x")</script>`;
  const { html } = buildConfirmationEmail(
    context({ firstName: nasty, specialRequests: `Table by the "window" & quiet` }),
  );

  assert.doesNotMatch(html, /<script>/, "a script tag must never survive into the body");
  assert.ok(html.includes("&lt;script&gt;"), "it should appear escaped instead");
  assert.ok(html.includes("&quot;window&quot;"), "quotes are escaped");
  assert.ok(html.includes("&amp; quiet"), "ampersands are escaped");
});

test("escapeHtml handles the five characters that matter", () => {
  assert.equal(escapeHtml(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
  assert.equal(escapeHtml("plain"), "plain");
  // Ampersand is escaped first, so entities are not double-escaped.
  assert.equal(escapeHtml("a & b"), "a &amp; b");
});

test("an address is redacted before it reaches a log", () => {
  assert.equal(redactEmail("john.whitfield@example.com"), "j***@example.com");
  assert.equal(redactEmail("nonsense"), "***");
  assert.equal(redactEmail(""), "***");
});

/* ────────────────────────────────────────────────── configuration ───────── */

test("the sender is the verified TAVOLO alias", () => {
  assert.equal(CONFIRMATION_FROM, "TAVOLO <support@vioniche.com>");
});

const provider = readFileSync(new URL("../lib/notifications/email-provider.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../lib/notifications/service.ts", import.meta.url), "utf8");
const adminActions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
const bookingActions = readFileSync(new URL("../lib/booking/actions.ts", import.meta.url), "utf8");

test("F — every send goes out as that sender, and the key rides in a header", () => {
  // The from address is the provider's to set, never the caller's to pass.
  assert.match(provider, /from:\s*CONFIRMATION_FROM/);
  // Idempotency is handed to Resend alongside the payload.
  assert.match(provider, /idempotencyKey\s*\}/);
});

test("the API key is read from the environment and never hardcoded or exposed", () => {
  assert.match(provider, /process\.env\.RESEND_API_KEY/);
  // No NEXT_PUBLIC variant anywhere, which would ship the key to the browser.
  for (const source of [provider, service, adminActions, bookingActions]) {
    assert.doesNotMatch(source, /NEXT_PUBLIC_RESEND/);
  }
  // No key-shaped literal.
  assert.doesNotMatch(provider, /re_[A-Za-z0-9]{8,}/, "no key may be written into the source");
  // Server-only, so importing it from a client component is a build error.
  assert.match(provider, /^import "server-only";/m);
});

test("the key is never written to a log", () => {
  const logLines = provider.split("\n").filter((l) => /console\.(log|info|warn|error)/.test(l));
  for (const line of logLines) {
    assert.doesNotMatch(line, /RESEND_API_KEY|apiKey/, `a log line must not carry the key: ${line.trim()}`);
  }
});

test("the confirmation goes to the guest's email, not their phone", () => {
  const start = service.indexOf("export async function sendConfirmationEmail");
  const body = service.slice(start, start + 2600);
  assert.match(body, /recipient: built\.to/);
  assert.doesNotMatch(body, /\.phone/, "the confirmation email must never address a phone number");
});

test("booking a table does not send a confirmation — only assigning one does", () => {
  // The public booking action must not reach the email path at all.
  assert.doesNotMatch(bookingActions, /sendConfirmationEmail/);
  // And the admin flow sends it from the confirmation helper.
  assert.match(adminActions, /async function sendConfirmation\(/);
  assert.match(adminActions, /sendConfirmationEmail\(reservationId\)/);
});

test("a delivery failure can never fail the table assignment", () => {
  const start = adminActions.indexOf("async function sendConfirmation(");
  const body = adminActions.slice(start, start + 900);
  // Wrapped, and the outcome is logged rather than thrown or returned upward.
  assert.match(body, /try\s*{/);
  assert.match(body, /catch/);
  assert.doesNotMatch(body, /throw/, "it must never rethrow to the assignment");
  assert.doesNotMatch(body, /return\s+\{\s*ok:\s*false/, "and never report a failure upward");
});

test("the idempotency key is stable for a booking", () => {
  const a = confirmationIdempotencyKey("abc-123");
  const b = confirmationIdempotencyKey("abc-123");
  assert.equal(a, b, "the same booking must always produce the same key");
  assert.notEqual(a, confirmationIdempotencyKey("abc-124"));
  assert.ok(a.includes("abc-123"));
  assert.ok(a.length <= 256, "Resend limits the key length");
});
