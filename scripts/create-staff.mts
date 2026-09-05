/**
 * Creates or updates a staff login. Credentials come from the environment, so
 * nothing is ever committed to source.
 *
 *   ADMIN_EMAIL=chef@tavolo.example ADMIN_PASSWORD='…' ADMIN_NAME='Chef' \
 *     npm run staff:add
 *
 * Re-running with the same email resets that person's password.
 */
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { createDb } from "../lib/db/connect";
import { hashPassword } from "../lib/auth/password";

const url = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Staff";
const role = (process.env.ADMIN_ROLE as "owner" | "staff") || "owner";

if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD, e.g.\n");
  console.error("  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run staff:add");
  process.exit(1);
}
if (password.length < 4) {
  console.error("Choose a password of at least 4 characters.");
  process.exit(1);
}
if (password.length < 12) {
  // Short passwords are allowed so a new install can get moving, but this
  // account can read and change every reservation — say so plainly.
  console.warn(
    `\n  ⚠  That password is ${password.length} characters.\n` +
      "     This login controls every reservation in the restaurant.\n" +
      "     Set a longer one before this is reachable from the internet:\n" +
      "       ADMIN_EMAIL=… ADMIN_PASSWORD='a-longer-password' npm run staff:add\n",
  );
}

const db = createDb(url);
const passwordHash = await hashPassword(password);

const existing = await db
  .select({ id: schema.staffUsers.id })
  .from(schema.staffUsers)
  .where(eq(schema.staffUsers.email, email))
  .limit(1);

if (existing.length > 0) {
  await db
    .update(schema.staffUsers)
    .set({ passwordHash, name, role, isActive: true })
    .where(eq(schema.staffUsers.id, existing[0].id));
  console.log(`✓ Password reset for ${email}`);
} else {
  await db.insert(schema.staffUsers).values({ email, name, passwordHash, role });
  console.log(`✓ Staff account created for ${email} (${role})`);
}
