/**
 * The messaging provider seam.
 *
 * Nothing above this file knows how a message is delivered. Swapping in a real
 * SMS or WhatsApp provider means writing one `NotificationProvider` and
 * selecting it here — no call site changes.
 */

export type SendRequest = {
  to: string;
  message: string;
};

export type SendResult =
  | { status: "sent"; provider: string; reference?: string }
  /** Accepted by the mock provider — nothing actually left the building. */
  | { status: "simulated"; provider: string }
  | { status: "failed"; provider: string; error: string };

export interface NotificationProvider {
  readonly name: string;
  send(request: SendRequest): Promise<SendResult>;
}

/**
 * The default. Records what would have been sent and marks it `simulated`, so
 * the dashboard can say plainly that no message went out.
 */
export const mockProvider: NotificationProvider = {
  name: "mock",
  async send({ to, message }) {
    console.info(`[notifications] SIMULATED — no provider configured\n  to: ${to}\n  ${message}`);
    return { status: "simulated", provider: "mock" };
  },
};

/**
 * Selects the provider from the environment.
 *
 * To connect a real one:
 *   1. implement NotificationProvider for it,
 *   2. return it from the switch below,
 *   3. set SMS_PROVIDER and the provider's credentials in the environment.
 *
 * Credentials are read from the environment only — never committed, never
 * shipped to the browser.
 */
export function resolveProvider(): NotificationProvider {
  const configured = process.env.SMS_PROVIDER?.trim().toLowerCase();

  switch (configured) {
    case undefined:
    case "":
    case "mock":
      return mockProvider;

    default:
      // A provider was named but no implementation exists yet. Say so rather
      // than silently pretending the message was delivered.
      console.warn(
        `[notifications] SMS_PROVIDER="${configured}" has no implementation; using the mock provider.`,
      );
      return mockProvider;
  }
}

export function providerIsConfigured(): boolean {
  return resolveProvider().name !== "mock";
}
