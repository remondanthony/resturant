import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Password hashing with scrypt from Node's standard library.
 *
 * No `server-only` marker: the staff-account CLI script imports this directly.
 * It depends on node:crypto, so it cannot run in a browser regardless.
 *
 * Passwords are never stored or logged in plaintext. Format is
 * `scrypt$<saltHex>$<hashHex>` so the algorithm can be changed later without
 * breaking existing rows.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}
