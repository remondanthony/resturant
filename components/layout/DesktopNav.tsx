"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/site";

/**
 * Desktop navigation. Client-side only because the current route decides the
 * active state; everything else in the header stays a Server Component.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-9">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`group/nav relative inline-flex min-h-11 items-center text-eyebrow font-medium uppercase transition-colors duration-180 ${
                  isActive ? "text-amber-soft" : "text-cream-200 hover:text-cream-50"
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-amber-glow transition-transform duration-180 ease-out-expo ${
                    isActive ? "scale-x-100" : "scale-x-0 group-hover/nav:scale-x-100"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
