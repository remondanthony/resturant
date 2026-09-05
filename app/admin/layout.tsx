import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getStaffUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Staff",
  // Keep the dashboard out of search results entirely.
  robots: { index: false, follow: false },
};

/**
 * The dashboard chrome is skipped on the login screen, which has no session
 * yet. Every other admin page re-verifies through requireStaffPage().
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getStaffUser();

  if (!user) return <>{children}</>;

  return <AdminShell user={user}>{children}</AdminShell>;
}
