import { formatLongDate, formatTime } from "@/lib/booking/time";
import { site } from "@/lib/site";

/**
 * What the confirmation email *is* — its sender, its identity and its bodies.
 * How it is delivered lives in `email-provider.ts`.
 *
 * Deliberately free of `server-only` and of any provider import, so the tests
 * can exercise it in plain Node. Nothing here reads a secret or touches the
 * network.
 *
 * The body is a table layout with inline styles, because that is what email
 * clients actually render. The palette is TAVOLO's, inverted: a dark band
 * carries the wordmark and the body sits on cream, which survives Outlook and
 * prints legibly. Every colour here is the same token value the site uses.
 *
 * Nothing in this email implies the booking is still a request. By the time it
 * is sent the table has been assigned and the reservation is confirmed.
 */

/** The verified sender. The domain is verified in Resend; the alias forwards. */
export const CONFIRMATION_FROM = "TAVOLO <support@vioniche.com>";

/**
 * A stable key for one logical confirmation.
 *
 * The same booking always produces the same key, so a repeat of this request
 * is the same send as far as Resend is concerned rather than a second one.
 * This is the second line of defence; the first is the unique index.
 */
export function confirmationIdempotencyKey(reservationId: string): string {
  return `tavolo-booking_confirmed-${reservationId}`;
}

/** `j***@example.com` — enough to identify a delivery, not a mailing list. */
export function redactEmail(address: string): string {
  const at = address.indexOf("@");
  if (at <= 0) return "***";
  return `${address[0]}***${address.slice(at)}`;
}

export type ConfirmationEmailContext = {
  firstName: string;
  lastName: string;
  reservationCode: string;
  /** ISO date, e.g. 2026-09-20. */
  date: string;
  /** 24h time, e.g. "19:30" or "19:30:00". */
  startTime: string;
  partySize: number;
  tableName: string | null;
  specialRequests: string | null;
};

export type BuiltEmail = { subject: string; html: string; text: string };

/**
 * Guest names and special requests are free text that a guest typed. They are
 * escaped before they reach the markup — an email body is still a document,
 * and a stray `<` should never become a tag.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  espresso: "#080605",
  espressoSoft: "#1a1512",
  cream: "#faf6ef",
  creamPanel: "#f2eada",
  ink: "#221d18",
  muted: "#6b6155",
  copper: "#b4622c",
  line: "#e0d6c4",
};

function row(label: string, value: string): string {
  return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${COLORS.line};font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};width:44%;">${label}</td>
          <td style="padding:14px 0;border-bottom:1px solid ${COLORS.line};font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${COLORS.ink};">${value}</td>
        </tr>`;
}

export function buildConfirmationEmail(context: ConfirmationEmailContext): BuiltEmail {
  const guestName = `${context.firstName} ${context.lastName}`.trim();
  const when = formatLongDate(context.date);
  const time = formatTime(context.startTime);
  const guests = `${context.partySize} ${context.partySize === 1 ? "guest" : "guests"}`;
  const table = context.tableName?.trim() || null;
  const requests = context.specialRequests?.trim() || null;

  const subject = `Your table is confirmed — ${when} at ${time} · ${site.name}`;

  /* ── plain text ───────────────────────────────────────────────────────── */
  const textLines = [
    `${site.name.toUpperCase()}`,
    "",
    `Dear ${guestName},`,
    "",
    "Your table is confirmed. We look forward to welcoming you.",
    "",
    `Reservation code: ${context.reservationCode}`,
    `Date: ${when}`,
    `Time: ${time}`,
    `Guests: ${guests}`,
    ...(table ? [`Table: ${table}`] : []),
    ...(requests ? ["", `Your note to us: ${requests}`] : []),
    "",
    "Please keep your reservation code — you will need it, with the contact",
    "details you booked with, to view or cancel this booking.",
    "",
    `If anything changes, call us on ${site.contact.phone} and we will take care of it.`,
    "",
    "With warm regards,",
    `The ${site.name} team`,
    "",
    site.contact.address.join(", "),
    site.contact.phone,
  ];
  const text = textLines.join("\n");

  /* ── html ─────────────────────────────────────────────────────────────── */
  const detailRows = [
    row("Reservation", escapeHtml(context.reservationCode)),
    row("Date", escapeHtml(when)),
    row("Time", escapeHtml(time)),
    row("Guests", escapeHtml(guests)),
    ...(table ? [row("Table", escapeHtml(table))] : []),
  ].join("");

  const requestBlock = requests
    ? `
      <tr>
        <td style="padding:0 40px 8px;">
          <p style="margin:24px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};">Your note to us</p>
          <p style="margin:0;padding:14px 18px;border-left:2px solid ${COLORS.copper};background:${COLORS.creamPanel};font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${COLORS.ink};">${escapeHtml(requests)}</p>
        </td>
      </tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.creamPanel};">
<!-- Shown in the inbox preview line, never on screen. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your table at ${escapeHtml(site.name)} is confirmed for ${escapeHtml(when)} at ${escapeHtml(time)}.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.creamPanel};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${COLORS.cream};">

        <!-- Wordmark -->
        <tr>
          <td align="center" style="background:${COLORS.espresso};padding:38px 40px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.34em;text-indent:0.34em;color:${COLORS.cream};font-weight:300;">${escapeHtml(site.name)}</div>
            <div style="margin-top:10px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#8d8275;">Modern Italian &middot; London</div>
          </td>
        </tr>

        <!-- Heading -->
        <tr>
          <td style="padding:44px 40px 0;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.copper};">Reservation confirmed</p>
            <h1 style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:normal;color:${COLORS.ink};">Your table is confirmed.</h1>
            <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:${COLORS.ink};">Dear ${escapeHtml(guestName)},</p>
            <p style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:${COLORS.ink};">
              Everything is arranged${table ? ` and ${escapeHtml(table)} is held for you` : ""}. We look forward to welcoming you.
            </p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.line};">
              ${detailRows}
            </table>
          </td>
        </tr>
        ${requestBlock}

        <!-- Keeping the code -->
        <tr>
          <td style="padding:28px 40px 0;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${COLORS.muted};">
              Please keep your reservation code. You will need it, together with the contact details you booked with, to view or cancel this booking.
            </p>
          </td>
        </tr>

        <!-- Closing -->
        <tr>
          <td style="padding:26px 40px 44px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:${COLORS.ink};">
              If anything changes, call us on
              <a href="${site.contact.phoneHref}" style="color:${COLORS.copper};text-decoration:none;">${escapeHtml(site.contact.phone)}</a>
              and we will take care of it.
            </p>
            <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:${COLORS.ink};">
              With warm regards,<br>
              <span style="color:${COLORS.muted};">The ${escapeHtml(site.name)} team</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${COLORS.espressoSoft};padding:26px 40px;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.8;color:#8d8275;">
              ${escapeHtml(site.contact.address.join(", "))}<br>
              ${escapeHtml(site.contact.phone)}
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
