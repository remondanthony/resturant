"use client";

import Link from "next/link";
import { Bell, CalendarPlus, CalendarX, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/components/admin/RealtimeProvider";

/**
 * Toast stack for incoming bookings.
 *
 * Sits above the mobile bottom navigation so it never covers the controls
 * staff need mid-service, and is announced politely rather than assertively —
 * a booking is information, not an emergency.
 */
export function RealtimeToasts() {
  const { toasts, dismiss } = useRealtime();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="New reservations"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:w-80 lg:bottom-6"
    >
      {toasts.map((toast) => {
        // An action confirmation is a single line — the staff member already
        // knows what they did; this only says it landed.
        if (toast.kind === "action") {
          return (
            <article
              key={toast.key}
              className="toast-in pointer-events-auto flex w-full items-center gap-3 border border-line-strong bg-espresso-900 px-4 py-3 shadow-lift"
            >
              <Check
                aria-hidden="true"
                strokeWidth={1.75}
                className="size-4 shrink-0 text-emerald-300"
              />
              <p className="flex-1 text-sm text-cream-100">{toast.title}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.key)}
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center text-cream-400 transition-colors duration-180 hover:text-cream-100"
              >
                <X aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
                <span className="sr-only">Dismiss</span>
              </button>
            </article>
          );
        }

        const Icon = toast.kind === "created" ? CalendarPlus : CalendarX;
        return (
          <article
            key={toast.key}
            className="toast-in pointer-events-auto w-full border border-line-strong bg-espresso-900 shadow-lift"
          >
            <div className="flex items-start gap-3 p-4">
              <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className={`mt-0.5 size-4 shrink-0 ${toast.kind === "created" ? "text-amber-glow" : "text-rose-300"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
                  {toast.title}
                </p>
                <p className="mt-1.5 truncate font-display text-lg font-light text-cream-50">
                  {toast.guestName}
                </p>
                <p className="lining-figures mt-1 text-xs text-cream-300">{toast.detail}</p>
                <Link
                  href={`/admin/reservations/${toast.reservationId ?? ""}`}
                  onClick={() => dismiss(toast.key)}
                  className="mt-3 inline-flex min-h-9 items-center text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
                >
                  View reservation
                </Link>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.key)}
                className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center text-cream-400 transition-colors hover:text-cream-100"
              >
                <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
                <span className="sr-only">Dismiss notification for {toast.guestName}</span>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Bell with a count, and the recent arrivals behind it. */
export function RealtimeBell() {
  const { recent, clearRecent } = useRealtime();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative inline-flex size-10 items-center justify-center rounded-xs text-cream-200 transition-colors hover:text-amber-soft"
      >
        <Bell aria-hidden="true" strokeWidth={1.5} className="size-4" />
        {recent.length > 0 ? (
          <span className="lining-figures absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-pill bg-amber-glow px-1 text-[0.5625rem] font-semibold text-espresso-950">
            {recent.length}
          </span>
        ) : null}
        <span className="sr-only">
          {recent.length === 0
            ? "Recent reservation activity"
            : `Recent reservation activity, ${recent.length} new`}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] border border-line-strong bg-espresso-900 shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
              Recent activity
            </p>
            {recent.length > 0 ? (
              <button
                type="button"
                onClick={clearRecent}
                className="text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-400 transition-colors hover:text-amber-soft"
              >
                Clear
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-cream-400">
              Nothing new since you opened the dashboard.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {recent.map((item) => (
                <li key={item.key}>
                  <Link
                    href={`/admin/reservations/${item.reservationId ?? ""}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-cream-100/[0.04]"
                  >
                    <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-cream-400">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-cream-100">{item.guestName}</p>
                    <p className="lining-figures mt-0.5 text-xs text-cream-400">{item.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Quiet connection indicator — informative, never alarming. */
export function RealtimeStatus() {
  const { connection } = useRealtime();

  const label =
    connection === "live" ? "Live" : connection === "connecting" ? "Connecting" : "Reconnecting";

  return (
    <span
      className="hidden items-center gap-2 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-400 sm:inline-flex"
      title={
        connection === "live"
          ? "Receiving updates as they happen"
          : "Updates will resume automatically"
      }
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-pill ${
          connection === "live" ? "bg-emerald-400" : "bg-amber-glow"
        }`}
      />
      {label}
      <span className="sr-only">
        {connection === "live"
          ? "Realtime updates connected"
          : "Realtime updates reconnecting; the dashboard will resync automatically"}
      </span>
    </span>
  );
}
