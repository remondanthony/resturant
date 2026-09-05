"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ReserveButton } from "@/components/layout/ReserveButton";
import { navLinks, site } from "@/lib/site";

/**
 * Mobile navigation built on a native <dialog>.
 *
 * The platform gives us the modal behaviour for free and correctly: focus is
 * trapped inside the panel, Escape closes it, the rest of the page is inert to
 * assistive technology, and focus returns to the trigger on close.
 */
export function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    // A modal dialog does not stop the page behind it from scrolling.
    // `scrollbar-gutter: stable` on <html> keeps this from shifting layout.
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Close if the viewport grows into the desktop navigation.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia("(min-width: 1024px)");
    const close = () => query.matches && setOpen(false);
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-haspopup="dialog"
        className="-mr-3 inline-flex size-12 items-center justify-center rounded-xs text-cream-100 transition-colors duration-180 hover:text-amber-soft lg:hidden"
      >
        <Menu aria-hidden="true" strokeWidth={1.25} className="size-6" />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        id="mobile-menu"
        ref={dialogRef}
        aria-label="Site menu"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        className="sheet m-0 h-dvh max-h-none w-full max-w-none border-0 bg-espresso-950 p-0 text-cream-100 backdrop:bg-espresso-950/70 open:flex open:flex-col"
      >
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-5 sm:px-8">
          <span className="font-display text-xl font-light uppercase tracking-[0.34em] text-cream-100">
            <span className="-mr-[0.34em]">{site.name}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-3 inline-flex size-12 items-center justify-center rounded-xs text-cream-100 transition-colors duration-180 hover:text-amber-soft"
          >
            <X aria-hidden="true" strokeWidth={1.25} className="size-6" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <nav
          aria-label="Primary"
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-8"
        >
          <ul className="flex flex-col">
            {navLinks.map((link, index) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="border-b border-line">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-16 items-center justify-between gap-6 py-5 font-display text-3xl font-light transition-colors duration-180 sm:text-4xl ${
                      isActive ? "text-amber-soft" : "text-cream-100 hover:text-amber-soft"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      {isActive ? (
                        <span aria-hidden="true" className="h-px w-6 bg-copper" />
                      ) : null}
                      {link.label}
                    </span>
                    <span aria-hidden="true" className="font-sans text-eyebrow text-cream-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-8">
          <ReserveButton size="lg" className="w-full" onNavigate={() => setOpen(false)} />
          <a
            href={site.contact.phoneHref}
            className="mt-5 flex min-h-11 items-center justify-center text-sm text-cream-300 transition-colors duration-180 hover:text-amber-soft"
          >
            {site.contact.phone}
          </a>
        </div>
      </dialog>
    </>
  );
}
