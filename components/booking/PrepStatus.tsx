"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPrepStatusForGuest } from "@/lib/booking/actions";
import {
  estimatedReadyAt,
  formatRemaining,
  guestHeadline,
  isFinished,
  type PrepTimerView,
} from "@/lib/prep-timer/types";

/**
 * What the guest sees while the kitchen is working.
 *
 * Read-only in the strongest sense: the only thing this can call is a lookup
 * that re-checks the guest's own reservation code and contact. There is no
 * control here because there is no action to reach — every timer control is
 * behind `requireStaff` in the admin actions.
 *
 * The countdown is drawn from the server's `endsAt` and re-read regularly, so
 * when the kitchen adds five minutes the guest's screen follows without them
 * doing anything.
 */

/** How often to ask the server again while something is cooking. */
const POLL_MS = 15_000;
/** After hitting zero, give the server a moment before asking. */
const SETTLE_DELAY_MS = 800;

export function PrepStatus({ code, contact }: { code: string; contact: string }) {
  const [timer, setTimer] = useState<PrepTimerView | null>(null);
  const [remaining, setRemaining] = useState(0);
  const skewRef = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accept = useCallback((next: PrepTimerView | null) => {
    if (next) skewRef.current = Date.parse(next.serverNow) - Date.now();
    setTimer(next);
    setRemaining(next?.remainingMs ?? 0);
  }, []);

  const refresh = useCallback(() => {
    void getPrepStatusForGuest(code, contact)
      .then(accept)
      .catch(() => {
        // Offline or a slow network. The last known end time keeps counting
        // down locally and the next poll reconciles it.
      });
  }, [code, contact, accept]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const running = timer !== null && (timer.status === "preparing" || timer.status === "delayed");

  // Recomputed from `endsAt` every tick, so a phone that slept is right again
  // the instant it wakes rather than continuing from where it left off.
  useEffect(() => {
    if (!running || !timer?.endsAt) return;
    const endsAt = Date.parse(timer.endsAt);

    const tick = () => {
      const left = Math.max(0, endsAt - (Date.now() + skewRef.current));
      setRemaining(left);
      if (left === 0 && !settleRef.current) {
        // Asking is all this does. Whether time is added, and how much, is the
        // server's decision — and it makes it once no matter how many guests
        // and staff are watching.
        settleRef.current = setTimeout(() => {
          settleRef.current = null;
          refresh();
        }, SETTLE_DELAY_MS);
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => {
      clearInterval(id);
      if (settleRef.current) {
        clearTimeout(settleRef.current);
        settleRef.current = null;
      }
    };
  }, [running, timer?.endsAt, refresh]);

  // Keep asking while anything is live, so staff adjustments arrive on their own.
  useEffect(() => {
    if (!timer || isFinished(timer.status)) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [timer, refresh]);

  // Nothing has been started for this booking, so say nothing.
  if (!timer || timer.status === "cancelled" || timer.status === "completed") return null;

  const ready = timer.status === "ready";
  const delayed = timer.status === "delayed";
  const paused = timer.status === "paused";
  const shown = paused ? timer.remainingMs : remaining;
  const readyAt = estimatedReadyAt(timer);

  return (
    <section
      aria-labelledby="prep-status-heading"
      className={`toast-in mt-8 border p-6 transition-colors duration-260 sm:p-7 ${
        ready
          ? "border-amber-glow/40 bg-amber-glow/[0.04]"
          : delayed
            ? "border-copper/50 bg-espresso-900"
            : "border-line bg-espresso-900"
      }`}
    >
      <p className="text-eyebrow font-medium uppercase text-amber-glow">Your order</p>

      <h3
        id="prep-status-heading"
        className="mt-3 font-display text-2xl font-light text-cream-50 sm:text-3xl"
      >
        {guestHeadline(timer.status)}
      </h3>

      {ready ? (
        <p className="mt-3 text-sm/relaxed text-cream-200">
          It is on its way to your table.
        </p>
      ) : (
        <>
          {delayed ? (
            <p className="mt-3 max-w-prose text-sm/relaxed text-cream-200">
              We&rsquo;re putting the finishing touches on your order.
            </p>
          ) : null}

          <p
            aria-live="off"
            className="lining-figures mt-5 font-display text-4xl font-light tabular-nums text-cream-50 sm:text-5xl"
          >
            {formatRemaining(shown)}
          </p>
          <p className="mt-1.5 text-eyebrow font-medium uppercase text-cream-400">
            {paused ? "held for a moment" : "remaining"}
          </p>

          {readyAt && !paused ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-eyebrow font-medium uppercase text-cream-400">
                Estimated ready time
              </p>
              <p className="lining-figures mt-2 font-display text-xl font-light text-cream-100">
                {readyAt.toLocaleTimeString("en-GB", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          ) : null}

          {delayed ? (
            <p className="mt-5 text-sm/relaxed text-cream-300">Thank you for your patience.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
