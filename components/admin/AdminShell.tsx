import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { AdminBottomNav, AdminSidebarNav } from "@/components/admin/AdminNav";
import { RealtimeProvider } from "@/components/admin/RealtimeProvider";
import { RealtimeBell, RealtimeStatus, RealtimeToasts } from "@/components/admin/RealtimeUI";
import { signOut } from "@/app/admin/actions";
import { site } from "@/lib/site";

/**
 * Dashboard chrome: a fixed sidebar on desktop, bottom navigation on phones.
 * Same palette and typefaces as the public site, but denser — this is a tool.
 */
export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: ReactNode;
}) {
  return (
    <RealtimeProvider>
    <div className="min-h-dvh bg-espresso-950">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-espresso-900/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="font-display text-lg font-light uppercase tracking-[0.3em] text-cream-100 transition-colors hover:text-amber-soft"
            >
              <span className="-mr-[0.3em]">{site.name}</span>
            </Link>
            <span className="hidden text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400 sm:inline">
              Staff
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <RealtimeStatus />
            <RealtimeBell />
            <Link
              href="/"
              className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-400 transition-colors hover:text-amber-soft lg:inline"
            >
              View site
            </Link>
            <span className="hidden text-right text-xs leading-tight text-cream-300 md:block">
              <span className="block">{user.name}</span>
              <span className="block text-[0.625rem] uppercase tracking-[0.16em] text-cream-400">
                {user.role}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 border border-line-strong px-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
              >
                <LogOut aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 top-14 z-40 hidden w-56 border-r border-line bg-espresso-900/60 lg:block">
        <AdminSidebarNav />
      </aside>

      {/* Content */}
      <main className="px-4 pb-28 pt-20 sm:px-6 lg:ml-56 lg:pb-12 lg:pt-20">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <AdminBottomNav />
      <RealtimeToasts />
    </div>
    </RealtimeProvider>
  );
}

/** Consistent page header inside the dashboard. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-light text-cream-50 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-cream-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
