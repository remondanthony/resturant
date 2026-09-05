"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeEvent } from "@/lib/realtime/events";

/**
 * Keeps every open dashboard in step with the database.
 *
 * The stream is a signal, never a data source: when an event arrives we call
 * `router.refresh()`, and the existing Server Components re-render from the
 * database. That is why a reservation can never appear twice in the list — the
 * list is a query result, not an accumulation of events.
 *
 * Only the toasts are built from event data, and those are deduplicated by
 * entity, row id and operation.
 */

export type Toast = {
  key: string;
  kind: "created" | "cancelled" | "action";
  title: string;
  /** Present when the toast refers to a specific booking. */
  reservationId?: string;
  guestName?: string;
  detail?: string;
  at: number;
};

export type ConnectionState = "connecting" | "live" | "reconnecting";

type RealtimeContextValue = {
  connection: ConnectionState;
  toasts: Toast[];
  recent: Toast[];
  dismiss: (key: string) => void;
  clearRecent: () => void;
  /** Confirms an action the staff member just took. Success only — errors stay
      inline next to the control that failed, where they can be read and acted
      on rather than disappearing. */
  notify: (title: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  connection: "connecting",
  toasts: [],
  recent: [],
  dismiss: () => {},
  clearRecent: () => {},
  notify: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

/** How long a toast stays. Arrivals linger; action confirmations are brief. */
const TOAST_MS = 9_000;
const ACTION_TOAST_MS = 3_200;
/** Window in which an identical event is treated as a repeat delivery. */
const DEDUPE_MS = 5 * 60_000;
/** Collapses a burst of changes into one refresh. */
const REFRESH_DEBOUNCE_MS = 400;
/**
 * If nothing arrives in this long — not even a ping — treat the connection as
 * dropped. Comfortably more than the server's 10s heartbeat so a slow network
 * is not mistaken for a failure.
 */
const SILENCE_TIMEOUT_MS = 25_000;
const MAX_RECENT = 12;

function formatClock(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recent, setRecent] = useState<Toast[]>([]);

  const seen = useRef(new Map<string, number>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadConnection = useRef(false);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  const dismiss = useCallback((key: string) => {
    setToasts((current) => current.filter((toast) => toast.key !== key));
  }, []);

  const clearRecent = useCallback(() => setRecent([]), []);

  const notify = useCallback((title: string) => {
    const toast: Toast = {
      key: `action:${title}:${Date.now()}`,
      kind: "action",
      title,
      at: Date.now(),
    };
    setToasts((current) => [...current, toast]);
  }, []);

  useEffect(() => {
    const source = new EventSource("/admin/stream");

    // Silence for longer than the heartbeat means the link is gone, even if
    // the browser has not surfaced an error yet.
    const noteTraffic = () => {
      setConnection("live");
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = setTimeout(
        () => setConnection("reconnecting"),
        SILENCE_TIMEOUT_MS,
      );
    };

    source.addEventListener("ready", () => {
      noteTraffic();
      // A reconnect may have missed events, so resync from the database.
      if (hadConnection.current) router.refresh();
      hadConnection.current = true;
    });

    source.addEventListener("ping", noteTraffic);

    source.onopen = () => noteTraffic();

    source.onerror = () => {
      // EventSource retries on its own; surface it without alarming anyone.
      setConnection((current) => (current === "live" ? "reconnecting" : current));
    };

    source.onmessage = (message) => {
      noteTraffic();
      let event: RealtimeEvent;
      try {
        event = JSON.parse(message.data) as RealtimeEvent;
      } catch {
        return;
      }

      // Repeat deliveries of the same change are ignored.
      const fingerprint = `${event.entity}:${event.id}:${event.op}:${event.reservation?.status ?? ""}`;
      const now = Date.now();
      for (const [key, at] of seen.current) {
        if (now - at > DEDUPE_MS) seen.current.delete(key);
      }
      if (seen.current.has(fingerprint)) return;
      seen.current.set(fingerprint, now);

      // Anything the dashboard displays warrants a resync.
      scheduleRefresh();

      const reservation = event.reservation;
      if (event.entity !== "reservations" || !reservation) return;

      const isNew = event.op === "insert";
      const isCancelled = event.op === "update" && reservation.status === "cancelled";
      if (!isNew && !isCancelled) return;

      const toast: Toast = {
        key: fingerprint,
        kind: isNew ? "created" : "cancelled",
        title: isNew
          ? reservation.bookingType === "private_dining"
            ? "New Private Dining Request"
            : "New Reservation"
          : "Reservation cancelled",
        reservationId: reservation.id,
        guestName: reservation.guestName,
        detail: [
          `${reservation.partySize} ${reservation.partySize === 1 ? "guest" : "guests"}`,
          reservation.tableName ?? "table not assigned",
          formatClock(reservation.startTime),
        ].join(" · "),
        at: now,
      };

      setToasts((current) => [...current.filter((t) => t.key !== toast.key), toast]);
      setRecent((current) => [toast, ...current.filter((t) => t.key !== toast.key)].slice(0, MAX_RECENT));
    };

    return () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (watchdog.current) clearTimeout(watchdog.current);
    };
  }, [router, scheduleRefresh]);

  // Retire toasts once they have had their time on screen.
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    const life = oldest.kind === "action" ? ACTION_TOAST_MS : TOAST_MS;
    const remaining = Math.max(0, oldest.at + life - Date.now());
    const timer = setTimeout(() => dismiss(oldest.key), remaining);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  const value = useMemo(
    () => ({ connection, toasts, recent, dismiss, clearRecent, notify }),
    [connection, toasts, recent, dismiss, clearRecent, notify],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
