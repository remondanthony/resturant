"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Minus, Pause, Play, Plus, Timer } from "lucide-react";
import { useRealtime } from "@/components/admin/RealtimeProvider";
import {
  adjustPrepTimer,
  completePrepTimer,
  loadPrepTimer,
  markPrepReady,
  pausePrepTimer,
  resumePrepTimer,
  startPrepTimer,
} from "@/app/admin/actions";
import {
  formatRemaining,
  isFinished,
  PREP_DURATIONS,
  type PrepTimerView,
} from "@/lib/prep-timer/types";

/**
 * The kitchen timer, on the reservation it belongs to.
 *
 * The countdown here is a display of the server's answer, not a timer of its
 * own: `endsAt` decides everything, and this only renders the distance to it.
 * That is why a refresh, a sleeping laptop or a second dashboard makes no
 * difference to what it shows.
 *
 * When the countdown reaches zero this asks the server rather than deciding
 * anything itself. The server adds its ten minutes — once, however many
 * screens ask at the same moment — and answers with the new end.
 */

/** How often to re-read while a timer is running, as a safety net under SSE. */
const SYNC_MS = 20_000;
/** How long to wait after hitting zero before asking, so the server has passed it. */
const SETTLE_DELAY_MS = 600;

const button =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap border px-3.5 " +
  "text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-[color,border-color,background-color,transform] " +
  "duration-180 ease-standard hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0";
const outline = "border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft";
const solid = "border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft";

export function PrepTimerPanel({
  reservationId,
  tableName,
  guestName,
  partySize,
  initialTimer,
}: {
  reservationId: string;
  tableName: string;
  guestName: string;
  partySize: number;
  initialTimer: PrepTimerView | null;
}) {
  const [choice, setChoice] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [pending, startAction] = useTransition();
  const { notify } = useRealtime();

  /**
   * The server's copy arrives as a prop and is the default answer. An action
   * or a resync can produce a newer one, held here against the prop it was
   * built on — so when the server sends a fresher prop this is discarded
   * automatically rather than a stale local copy winning.
   */
  const [override, setOverride] = useState<{
    base: PrepTimerView | null;
    value: PrepTimerView | null;
  } | null>(null);

  const timer = override && override.base === initialTimer ? override.value : initialTimer;

  const accept = useCallback(
    (next: PrepTimerView | null) => setOverride({ base: initialTimer, value: next }),
    [initialTimer],
  );

  const resync = useCallback(() => {
    void loadPrepTimer(reservationId)
      .then(accept)
      .catch(() => {
        // A failed read changes nothing: the row is still the authority and
        // the next tick will ask again.
      });
  }, [reservationId, accept]);

  const running = timer !== null && (timer.status === "preparing" || timer.status === "delayed");

  /**
   * The gap between this browser's clock and the server's, re-measured each
   * time a view arrives. The countdown is drawn against the server's clock, so
   * a machine set to the wrong time still shows the right number.
   */
  const skewRef = useRef(0);
  useEffect(() => {
    if (timer) skewRef.current = Date.parse(timer.serverNow) - Date.now();
  }, [timer]);

  /**
   * The server's current time, republished on a tick.
   *
   * Rendering must not read a clock, so the clock is read here and the render
   * below is a pure function of it. Nothing is decremented and nothing
   * accumulates, which is why a throttled or sleeping tab is right the moment
   * it wakes rather than resuming where it left off.
   */
  const [serverNowMs, setServerNowMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setServerNowMs(Date.now() + skewRef.current), 250);
    return () => clearInterval(id);
  }, [running]);

  // Until the first tick lands, the server's own figure is the best answer —
  // and it is already correct, so there is nothing to hide.
  const remaining =
    running && timer?.endsAt && serverNowMs > 0
      ? Math.max(0, Date.parse(timer.endsAt) - serverNowMs)
      : (timer?.remainingMs ?? 0);

  // Reaching zero is not this browser's decision to act on. It asks the
  // server, which is what actually adds the time — once, however many screens
  // are asking at the same moment.
  const expired = running && remaining === 0;
  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(resync, SETTLE_DELAY_MS);
    return () => clearTimeout(id);
  }, [expired, resync]);

  // Safety net for a dropped stream or a change made on another device.
  const live = timer !== null && !isFinished(timer.status);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(resync, SYNC_MS);
    return () => clearInterval(id);
  }, [live, resync]);

  function run(action: () => Promise<{ ok: boolean; message: string; timer?: PrepTimerView }>) {
    setError(null);
    startAction(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        // The server refused, so find out what it actually thinks is true.
        resync();
        return;
      }
      notify(result.message);
      if (result.timer) accept(result.timer);
      else resync();
    });
  }

  const heading = (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-light text-cream-100">
        <Timer aria-hidden="true" strokeWidth={1.25} className="size-4 text-copper-light" />
        Food preparation
      </h2>
      {tableName ? (
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
          {tableName}
        </span>
      ) : null}
    </div>
  );

  /* ── Nothing running: offer to start one ──────────────────────────────── */
  if (!timer || isFinished(timer.status)) {
    const finished = timer && isFinished(timer.status);
    return (
      <section aria-labelledby="prep-heading" className="border border-line bg-espresso-900 p-6">
        <div id="prep-heading">{heading}</div>

        {finished ? (
          <p className="mt-3 text-sm text-cream-300">
            {timer.status === "ready"
              ? "Marked ready."
              : timer.status === "completed"
                ? "Preparation completed."
                : "Preparation was stopped."}
          </p>
        ) : (
          <p className="mt-3 text-sm text-cream-400">
            {guestName} · {partySize} {partySize === 1 ? "guest" : "guests"}
          </p>
        )}

        <fieldset className="mt-5 border-0 p-0">
          <legend className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
            {finished ? "Start another" : "Preparation time"}
          </legend>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PREP_DURATIONS.map((minutes) => {
              const selected = minutes === choice;
              return (
                <li key={minutes}>
                  <button
                    type="button"
                    onClick={() => setChoice(minutes)}
                    aria-pressed={selected}
                    className={`lining-figures inline-flex min-h-10 items-center border px-4 text-sm transition-colors duration-180 ${
                      selected
                        ? "border-amber-glow bg-amber-glow/[0.07] text-amber-soft"
                        : "border-line text-cream-200 hover:border-line-strong"
                    }`}
                  >
                    {minutes} min
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mt-5">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => startPrepTimer(reservationId, choice))}
            className={`${button} ${solid}`}
          >
            {pending ? "Starting…" : "Start Timer"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-xs text-rose-300">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  /* ── A live timer ─────────────────────────────────────────────────────── */
  const paused = timer.status === "paused";
  const delayed = timer.status === "delayed";
  const shown = paused ? timer.remainingMs : remaining;

  return (
    <section
      aria-labelledby="prep-heading"
      className={`border bg-espresso-900 p-6 transition-colors duration-260 ${
        delayed ? "border-copper-light/50" : "border-line"
      }`}
    >
      <div id="prep-heading">{heading}</div>

      <p className="mt-3 text-sm text-cream-400">
        {guestName} · {partySize} {partySize === 1 ? "guest" : "guests"}
      </p>

      <div className="mt-5 flex items-baseline gap-3">
        <p
          aria-live="off"
          className="lining-figures font-display text-5xl font-light tabular-nums text-cream-50"
        >
          {formatRemaining(shown)}
        </p>
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
          {paused ? "held" : "remaining"}
        </span>
      </div>

      {/* Announced separately so a screen reader is told the state, not read a
          number that changes every second. */}
      <p role="status" className="mt-2 text-sm">
        {paused ? (
          <span className="text-cream-300">Paused.</span>
        ) : delayed ? (
          <span className="text-copper-light">
            Delayed — {timer.autoExtensionCount * 10} minutes added automatically.
          </span>
        ) : (
          <span className="text-cream-300">Preparing.</span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => adjustPrepTimer(reservationId, -5))}
          className={`${button} ${outline}`}
        >
          <Minus aria-hidden="true" strokeWidth={1.5} className="size-3" />5 min
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => adjustPrepTimer(reservationId, 5))}
          className={`${button} ${outline}`}
        >
          <Plus aria-hidden="true" strokeWidth={1.5} className="size-3" />5 min
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => adjustPrepTimer(reservationId, 10))}
          className={`${button} ${outline}`}
        >
          <Plus aria-hidden="true" strokeWidth={1.5} className="size-3" />10 min
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => (paused ? resumePrepTimer(reservationId) : pausePrepTimer(reservationId)))
          }
          className={`${button} ${outline}`}
        >
          {paused ? (
            <>
              <Play aria-hidden="true" strokeWidth={1.5} className="size-3" />
              Resume
            </>
          ) : (
            <>
              <Pause aria-hidden="true" strokeWidth={1.5} className="size-3" />
              Pause
            </>
          )}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markPrepReady(reservationId))}
          className={`${button} ${solid}`}
        >
          <Check aria-hidden="true" strokeWidth={1.75} className="size-3" />
          Mark Ready
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => completePrepTimer(reservationId))}
          className={`${button} ${outline}`}
        >
          Complete
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <p className="lining-figures mt-5 border-t border-line pt-4 text-xs text-cream-400">
        Asked for {timer.originalDurationMinutes} min
        {timer.extensionCount > 0 ? ` · ${timer.extensionCount} manual change${timer.extensionCount === 1 ? "" : "s"}` : ""}
        {timer.autoExtensionCount > 0 ? ` · ${timer.autoExtensionCount} automatic` : ""}
      </p>
    </section>
  );
}
