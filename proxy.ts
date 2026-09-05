import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Optimistic auth check (Next 16 renamed Middleware to Proxy).
 *
 * This keeps signed-out traffic off the dashboard cheaply. It is NOT the
 * authorization boundary — `requireStaff()` in lib/auth/dal.ts is, and every
 * admin page and action calls it. Never rely on this alone.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (pathname === "/admin/login") {
    if (session) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", request.url);
    // Come back to where they were headed once signed in.
    if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
