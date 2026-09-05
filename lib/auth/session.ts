/**
 * Stateless staff sessions: a JSON payload signed with HMAC-SHA256 and stored
 * in an httpOnly cookie.
 *
 * Uses Web Crypto rather than node:crypto so the same verification runs in
 * `proxy.ts` (Edge runtime) and in Server Components and Actions.
 *
 * The cookie is signed, not encrypted — it carries an id, a name and an expiry,
 * nothing sensitive. It is never readable by client JavaScript.
 */

export const SESSION_COOKIE = "tavolo_staff_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // one long shift

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  /** Seconds since epoch. */
  exp: number;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  // Backed by a plain ArrayBuffer so it satisfies BufferSource for Web Crypto.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** TextEncoder output, retyped for Web Crypto's BufferSource parameter. */
function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encoded = toBase64Url(utf8(JSON.stringify(body)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), utf8(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns null for anything that is not a currently valid, correctly signed token. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromBase64Url(signature),
      utf8(encoded),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    if (!payload.userId) return null;

    return payload;
  } catch {
    return null;
  }
}
