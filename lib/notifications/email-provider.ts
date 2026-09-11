import "server-only";

import { Resend } from "resend";
import { CONFIRMATION_FROM, redactEmail } from "@/lib/notifications/email-templates";

/**
 * The email provider seam — how a message is delivered.
 *
 * Deliberately separate from the SMS seam in `provider.ts`: an email has a
 * subject, an HTML body and a text fallback, and forcing that through a
 * `{ to, message }` shape would only hide the difference. Everything above
 * this file works in terms of `EmailProvider` and knows nothing about Resend.
 *
 * The API key is read from the environment on the server and never leaves it.
 * There is no NEXT_PUBLIC equivalent, and the key is never logged — not even
 * in part.
 */

export { CONFIRMATION_FROM, redactEmail };

export type EmailRequest = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Stable for a given logical message, so the same confirmation cannot be
   * delivered twice even if this is called again. Resend treats a repeat of
   * the same key as the same send rather than a new one.
   */
  idempotencyKey: string;
};

export type EmailResult =
  | { status: "sent"; provider: string; reference?: string }
  /** Accepted by the mock provider — nothing actually left the building. */
  | { status: "simulated"; provider: string }
  | { status: "failed"; provider: string; error: string };

export interface EmailProvider {
  readonly name: string;
  send(request: EmailRequest): Promise<EmailResult>;
}

/**
 * The fallback when no key is configured. Records what would have been sent
 * and marks it `simulated`, so the dashboard can say plainly that nothing was
 * delivered rather than implying the guest heard from us.
 */
export const mockEmailProvider: EmailProvider = {
  name: "mock",
  async send({ to, subject }) {
    console.info(
      `[email] SIMULATED — RESEND_API_KEY is not set\n  to: ${redactEmail(to)}\n  subject: ${subject}`,
    );
    return { status: "simulated", provider: "mock" };
  },
};

/** Created once per process, and only when a key is actually present. */
let client: Resend | null = null;

function resendClient(apiKey: string): Resend {
  client ??= new Resend(apiKey);
  return client;
}

export const resendProvider: EmailProvider = {
  name: "resend",
  async send({ to, subject, html, text, idempotencyKey }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { status: "failed", provider: "resend", error: "RESEND_API_KEY is not set." };
    }

    const { data, error } = await resendClient(apiKey).emails.send(
      { from: CONFIRMATION_FROM, to, subject, html, text },
      { idempotencyKey },
    );

    if (error) {
      // Resend's own message, which never contains the key.
      return { status: "failed", provider: "resend", error: error.message };
    }

    return { status: "sent", provider: "resend", reference: data?.id };
  },
};

/**
 * Picks the provider from the environment.
 *
 * With no key there is no pretending: the mock records the attempt as
 * simulated. That is the honest state for a local checkout, and the dashboard
 * shows it as such.
 */
export function resolveEmailProvider(): EmailProvider {
  return process.env.RESEND_API_KEY?.trim() ? resendProvider : mockEmailProvider;
}

export function emailIsConfigured(): boolean {
  return resolveEmailProvider().name !== "mock";
}
