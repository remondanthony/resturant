import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth/session";

/**
 * The authorization boundary.
 *
 * `proxy.ts` does a cheap cookie check to keep unauthenticated traffic off the
 * dashboard, but it is only an optimisation. This module is what actually
 * authorises: every admin page and every admin Server Action calls
 * `requireStaff()` before reading or writing anything.
 */

/** The signed session, if there is a valid one. Memoised per render pass. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
});

/**
 * The current staff member, re-checked against the database so a deactivated
 * account stops working immediately rather than at session expiry.
 */
export const getStaffUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  try {
    const rows = await getDb()
      .select({
        id: schema.staffUsers.id,
        name: schema.staffUsers.name,
        email: schema.staffUsers.email,
        role: schema.staffUsers.role,
        isActive: schema.staffUsers.isActive,
      })
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.id, session.userId))
      .limit(1);

    const user = rows[0];
    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
});

/** For pages: redirects to the login screen when not signed in. */
export async function requireStaffPage() {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You are not signed in. Please sign in again.");
    this.name = "UnauthorizedError";
  }
}

/**
 * For Server Actions: throws rather than redirects, so a direct POST from an
 * unauthenticated client is refused instead of quietly doing nothing.
 */
export async function requireStaff() {
  const user = await getStaffUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
