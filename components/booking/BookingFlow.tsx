"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { loadAvailableTimes, submitBooking } from "@/lib/booking/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formatLongDate, formatTime } from "@/lib/booking/time";
import { formatPhone } from "@/lib/booking/phone";
import { initialFormState } from "@/lib/forms";

type Step = 1 | 2 | 3 | 4;

const STEPS: { index: Step; label: string }[] = [
  { index: 1, label: "Date" },
  { index: 2, label: "Guests" },
  { index: 3, label: "Time" },
  { index: 4, label: "Details" },
];

/**
 * The guest booking flow: date → guests → time → details.
 *
 * Guests never choose a table. They are booking dinner, not managing a floor
 * plan — the restaurant assigns the right table once the request arrives, so
 * no table name appears anywhere in this flow.
 *
 * Times come from the shared availability engine, and the final submit
 * re-checks server-side, so what is offered here cannot drift from what the
 * restaurant actually has free.
 */
export function BookingFlow({
  window,
}: {
  window: { min: string; max: string; minPartySize: number; maxPartySize: number };
}) {
  const [step, setStep] = useState<Step>(1);
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [startTime, setStartTime] = useState("");

  const [times, setTimes] = useState<string[]>([]);
  const [closed, setClosed] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, formAction] = useActionState(submitBooking, initialFormState);

  useEffect(() => {
    if (!date) return;
    startLoading(async () => {
      const result = await loadAvailableTimes(date, partySize);
      setClosed(result.closed?.reason ?? null);
      setTimes(result.times);
    });
  }, [date, partySize]);

  /** Changing the date or party size invalidates any time already picked. */
  function chooseDate(next: string) {
    setDate(next);
    setStartTime("");
  }

  function changePartySize(next: number) {
    setPartySize(next);
    setStartTime("");
  }

  /* ── Request received ──────────────────────────────────────────────────── */
  if (state.status === "sent") {
    const submitted = state.data ?? {};
    return (
      <div className="border border-amber-glow/30 bg-espresso-900 p-8 sm:p-12">
        <span className="inline-flex items-center gap-3 text-eyebrow font-medium uppercase text-amber-glow">
          <Check aria-hidden="true" strokeWidth={1.5} className="confirm-mark size-4" />
          Request received
        </span>
        <span aria-hidden="true" className="confirm-rule mt-5 block h-px w-16 bg-amber-glow/60" />
        <h2 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] font-light leading-tight text-cream-50">
          Thank you, {submitted.guestName}.
        </h2>

        <p className="mt-5 text-base/relaxed text-cream-300">
          {formatLongDate(submitted.date ?? date)} at {formatTime(submitted.startTime ?? startTime)}
          {" · "}
          {submitted.partySize} {submitted.partySize === "1" ? "guest" : "guests"}
        </p>

        {/* Careful wording: the table is not assigned yet, and no message has
            been confirmed as delivered. */}
        <p className="mt-6 max-w-prose border-l border-copper/60 pl-4 text-sm/relaxed text-cream-200">
          We&rsquo;ll confirm your table shortly. Once the restaurant has assigned it, a
          confirmation goes to{" "}
          <span className="lining-figures text-cream-100">
            {formatPhone(submitted.phone ?? "")}
          </span>
          .
        </p>

        <div className="mt-8 border-y border-line py-6">
          <p className="text-eyebrow font-medium uppercase text-cream-400">Reservation</p>
          <p className="lining-figures mt-3 font-display text-4xl font-light text-amber-soft">
            {state.reference}
          </p>
          <p className="mt-4 max-w-prose text-sm/relaxed text-cream-400">
            Keep this code. You will need it, with your mobile number, to view or cancel the
            booking.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/reservations/manage"
            className="inline-flex min-h-12 items-center border border-line-strong px-6 text-eyebrow font-medium uppercase text-cream-100 transition-colors hover:border-amber-glow hover:text-amber-soft"
          >
            Manage booking
          </Link>
          <Link
            href="/menu"
            className="inline-flex min-h-12 items-center border border-line-strong px-6 text-eyebrow font-medium uppercase text-cream-100 transition-colors hover:border-amber-glow hover:text-amber-soft"
          >
            Explore Menu
          </Link>
        </div>
      </div>
    );
  }

  const canAdvance =
    (step === 1 && Boolean(date)) ||
    (step === 2 && partySize >= window.minPartySize) ||
    (step === 3 && Boolean(startTime));

  const stepButton =
    "inline-flex min-h-12 items-center justify-center border px-6 text-eyebrow font-medium uppercase transition-colors duration-180";

  return (
    <div>
      <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-5">
        {STEPS.map((entry) => {
          const done = entry.index < step;
          const current = entry.index === step;
          return (
            <li key={entry.index} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`lining-figures text-eyebrow font-medium ${
                  current ? "text-amber-glow" : done ? "text-cream-300" : "text-cream-400"
                }`}
              >
                {String(entry.index).padStart(2, "0")}
              </span>
              <span
                className={`text-eyebrow font-medium uppercase ${
                  current ? "text-cream-50" : done ? "text-cream-300" : "text-cream-400"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {entry.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Keyed on the step so each one animates in as it arrives. */}
      <div key={step} className="step-in mt-10">
        {step === 1 ? (
          <section aria-labelledby="step-date">
            <h2 id="step-date" className="font-display text-2xl font-light text-cream-100">
              Which evening?
            </h2>
            <label
              htmlFor="booking-date"
              className="mt-6 block text-eyebrow font-medium uppercase text-cream-300"
            >
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              min={window.min}
              max={window.max}
              value={date}
              onChange={(event) => chooseDate(event.target.value)}
              className="mt-3 w-full max-w-xs min-h-12 rounded-xs border border-line-strong bg-espresso-900 px-4 py-3 text-base text-cream-100 outline-none transition-colors focus-visible:border-amber-glow"
            />
            <p className="mt-3 text-sm text-cream-400">We are closed on Mondays.</p>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby="step-guests">
            <h2 id="step-guests" className="font-display text-2xl font-light text-cream-100">
              How many of you?
            </h2>
            <div className="mt-6 flex items-center gap-5">
              <button
                type="button"
                onClick={() => changePartySize(Math.max(window.minPartySize, partySize - 1))}
                disabled={partySize <= window.minPartySize}
                aria-label="One fewer guest"
                className="inline-flex size-12 items-center justify-center border border-line-strong text-cream-100 transition-colors hover:border-amber-glow hover:text-amber-soft disabled:opacity-40"
              >
                <Minus aria-hidden="true" strokeWidth={1.5} className="size-4" />
              </button>
              <output
                aria-live="polite"
                className="lining-figures min-w-16 text-center font-display text-4xl font-light text-cream-50"
              >
                {partySize}
              </output>
              <button
                type="button"
                onClick={() => changePartySize(Math.min(window.maxPartySize, partySize + 1))}
                disabled={partySize >= window.maxPartySize}
                aria-label="One more guest"
                className="inline-flex size-12 items-center justify-center border border-line-strong text-cream-100 transition-colors hover:border-amber-glow hover:text-amber-soft disabled:opacity-40"
              >
                <Plus aria-hidden="true" strokeWidth={1.5} className="size-4" />
              </button>
            </div>
            <p className="mt-5 max-w-prose text-sm/relaxed text-cream-400">
              We seat parties of {window.minPartySize} to {window.maxPartySize} online. For a larger
              group,{" "}
              <Link
                href="/private-dining"
                className="text-cream-200 underline underline-offset-4 hover:text-amber-soft"
              >
                private dining
              </Link>{" "}
              is the better fit.
            </p>
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby="step-time">
            <h2 id="step-time" className="font-display text-2xl font-light text-cream-100">
              What time?
            </h2>
            <p className="mt-2 text-sm text-cream-400">
              Sittings still open for {partySize}{" "}
              {partySize === 1 ? "guest" : "guests"} on {formatLongDate(date)}.
            </p>

            {loading ? (
              <p className="mt-6 text-sm text-cream-400">Checking availability…</p>
            ) : closed ? (
              <p className="mt-6 border-l border-copper/60 pl-4 text-sm/relaxed text-cream-300">
                {closed}
              </p>
            ) : times.length === 0 ? (
              <p className="mt-6 border-l border-copper/60 pl-4 text-sm/relaxed text-cream-300">
                Nothing free for {partySize} that day. Try another date, or call us — we can often
                find something.
              </p>
            ) : (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {times.map((time) => {
                  const selected = time === startTime;
                  return (
                    <li key={time}>
                      <button
                        type="button"
                        onClick={() => setStartTime(time)}
                        aria-pressed={selected}
                        className={`lining-figures inline-flex min-h-12 items-center border px-5 text-sm transition-colors duration-180 ${
                          selected
                            ? "border-amber-glow bg-amber-glow/[0.07] text-amber-soft"
                            : "border-line text-cream-200 hover:border-line-strong"
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {step === 4 ? (
          <section aria-labelledby="step-details">
            <h2 id="step-details" className="font-display text-2xl font-light text-cream-100">
              Almost there.
            </h2>

            <dl className="mt-6 grid gap-x-10 gap-y-1 border-y border-line py-5 sm:grid-cols-2">
              <div className="flex justify-between gap-4 py-1.5 text-sm">
                <dt className="text-cream-400">Date</dt>
                <dd className="text-cream-100">{formatLongDate(date)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5 text-sm">
                <dt className="text-cream-400">Time</dt>
                <dd className="lining-figures text-cream-100">{formatTime(startTime)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1.5 text-sm">
                <dt className="text-cream-400">Guests</dt>
                <dd className="lining-figures text-cream-100">{partySize}</dd>
              </div>
            </dl>

            {state.status === "error" ? (
              <p
                role="alert"
                className="mt-6 border border-rose-400/40 bg-rose-400/5 p-4 text-sm/relaxed text-rose-300"
              >
                {state.message}
              </p>
            ) : null}

            <form key={state.attempt} action={formAction} noValidate className="mt-8 space-y-6">
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="startTime" value={startTime} />
              <input type="hidden" name="partySize" value={partySize} />

              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  defaultValue={state.values?.firstName}
                  error={state.errors?.firstName}
                />
                <Field
                  label="Last name"
                  name="lastName"
                  required
                  autoComplete="family-name"
                  defaultValue={state.values?.lastName}
                  error={state.errors?.lastName}
                />
                <Field
                  label="Mobile number"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  defaultValue={state.values?.phone}
                  error={state.errors?.phone}
                  hint="We confirm your table by text, so this needs to be right."
                  className="sm:col-span-2"
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.values?.email}
                  error={state.errors?.email}
                  className="sm:col-span-2"
                />
                <Field
                  label="Anything we should know?"
                  name="specialRequests"
                  as="textarea"
                  rows={3}
                  defaultValue={state.values?.specialRequests}
                  error={state.errors?.specialRequests}
                  hint="Allergies, an occasion, a seating preference."
                  className="sm:col-span-2"
                />
              </div>

              <SubmitButton pendingLabel="Sending…">Request Table</SubmitButton>
            </form>
          </section>
        ) : null}
      </div>

      {step < 4 ? (
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
            disabled={step === 1}
            className={`${stepButton} border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft disabled:opacity-40`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
            disabled={!canAdvance}
            className={`${stepButton} border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft disabled:opacity-40`}
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="mt-10 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`${stepButton} border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft`}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
