/**
 * The delivery seam for enquiries submitted through the site.
 *
 * There is no backend yet, so by default nothing is sent and the caller is told
 * exactly that — the UI must never claim a message reached the restaurant.
 *
 * To connect one later, set TAVOLO_ENQUIRY_ENDPOINT to a URL that accepts a
 * JSON POST (a route handler, a CRM webhook, a transactional email service).
 * Everything else — validation, states, markup — already works.
 */

/** Private dining is a real booking now; only the contact form uses this. */
export type EnquiryKind = "contact";

export type DeliveryOutcome =
  | { status: "sent"; reference: string }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export async function deliverEnquiry(
  kind: EnquiryKind,
  payload: Record<string, string>,
): Promise<DeliveryOutcome> {
  const endpoint = process.env.TAVOLO_ENQUIRY_ENDPOINT;

  if (!endpoint) return { status: "unavailable" };

  const reference = `TVL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, reference, receivedAt: new Date().toISOString(), ...payload }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "error",
        message: `The enquiry service responded with ${response.status}.`,
      };
    }
    return { status: "sent", reference };
  } catch {
    return {
      status: "error",
      message: "We could not reach the enquiry service.",
    };
  }
}
