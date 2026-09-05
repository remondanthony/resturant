"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  SquareStack,
  Ban,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/tables", label: "Tables", icon: SquareStack },
  { href: "/admin/availability", label: "Availability", icon: Ban },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar navigation, desktop only. */
export function AdminSidebarNav() {
  const isActive = useActive();

  return (
    <nav aria-label="Dashboard" className="p-3">
      <ul className="space-y-1">
        {LINKS.map((link) => {
          const active = isActive(link.href, link.exact);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xs px-3 text-sm transition-colors duration-180 ${
                  active
                    ? "bg-cream-100/[0.07] text-amber-soft"
                    : "text-cream-300 hover:bg-cream-100/[0.04] hover:text-cream-50"
                }`}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Bottom navigation for phones and small tablets — thumb-reachable, and the
 * five destinations staff actually need mid-service.
 */
export function AdminBottomNav() {
  const isActive = useActive();

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-espresso-900/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
        {LINKS.map((link) => {
          const active = isActive(link.href, link.exact);
          const Icon = link.icon;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 px-1 text-[0.5625rem] font-medium uppercase tracking-[0.12em] transition-colors duration-180 ${
                  active ? "text-amber-soft" : "text-cream-400 hover:text-cream-100"
                }`}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
                <span className="leading-none">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
