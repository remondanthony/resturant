"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { cancelOwnReservation, lookupReservation } from "@/lib/booking/actions";
import { Field } from "@/components/forms/Field";
import { PrepStatus } from "@/components/booking/PrepStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formatLongDate, formatTime } from "@/lib/booking/time";
import { initialFormState } from "@/lib/forms";
import { site } from "@/lib/site";

type Found = {
  code: string;
  contact: string;
  details: Record<string, string>;
};

/**
 * Guest self-service: look a booking up with its code and email, then cancel it
 * if needed. There are no customer accounts, so that pair is the credential and
 * the server re-verifies it before any change.
 */
export function ManageBooking() {
  const [state, formAction] = useActionState(lookupReservation, initialFormState);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const found: Found | null =
    state.status === "sent" && state.reference && state.values?.contact
      ? { code: state.reference, contact: state.values.contact, details: state.data ?? {} }
      : null;

  if (cancelled) {
    return (
      <div className="step-in border border-line bg-espresso-900 p-8">
        <h2 className="font-display text-2xl font-light text-cream-50">Cancelled</h2>
        <p className="mt-4 text-sm/relaxed text-cream-300">{cancelled}</p>
        <Link
          href="/reservations"
          className="mt-8 inline-flex min-h-12 items-center border border-line-strong px-6 text-eyebrow font-medium uppercase text-cream-100 transition-[color,border-color,transform] duration-180 ease-standard hover:-translate-y-0.5 hover:border-amber-glow hover:text-amber-soft"
        >
          Book again
        </Link>
      </div>
    );
  }

  if (found) {
    return (
      <div className="step-in border border-line bg-espresso-900 p-8">
        <p className="text-eyebrow font-medium uppercase text-amber-glow">Found</p>
        <p className="lining-figures mt-4 font-display text-3xl font-light text-cream-50">
          {found.code}
        </p>

        {/* Show what is being cancelled before offering the button. */}
        <dl className="mt-7 border-y border-line py-5 text-sm">
          {[
            ["Name", found.details.guestName],
            ["Date", found.details.date ? formatLongDate(found.details.date) : undefined],
            ["Time", found.details.startTime ? formatTime(found.details.startTime) : undefined],
            ["Guests", found.details.partySize],
            ["Table", found.details.tableName || undefined],
            ["Status", found.details.status?.replace("_", " ")],
          ]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-6 py-1.5">
                <dt className="text-cream-400">{label}</dt>
                <dd className="lining-figures text-right text-cream-100 capitalize">{value}</dd>
              </div>
            ))}
        </dl>

        {/* The kitchen's own progress, if an order is being prepared. Read
            only — it re-checks this guest's code and contact server-side and
            has no way to change anything. */}
        <PrepStatus code={found.code} contact={found.contact} />

        <p className="mt-6 max-w-prose text-sm/relaxed text-cream-300">
          To change the date, time or party size, please call us on{" "}
          <a
            href={site.contact.phoneHref}
            className="lining-figures text-cream-100 underline decoration-line-strong underline-offset-4 hover:text-amber-soft"
          >
            {site.contact.phone}
          </a>{" "}
          — we will move it while you are on the phone. You can cancel here.
        </p>

        {error ? (
          <p role="alert" className="mt-6 border border-rose-400/40 bg-rose-400/5 p-4 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {found.details.status === "cancelled" ? (
          <p className="mt-8 border-l border-copper/60 pl-4 text-sm text-cream-400">
            This booking is already cancelled. Nothing further to do.
          </p>
        ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelOwnReservation(found.code, found.contact);
              if (result.ok) setCancelled(result.message);
              else setError(result.message);
            });
          }}
          className="mt-8 inline-flex min-h-12 items-center border border-rose-400/50 px-6 text-eyebrow font-medium uppercase text-rose-300 transition-colors hover:bg-rose-400/10 disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Cancel Reservation"}
        </button>
        )}
      </div>
    );
  }

  return (
    /* Each phase replaces the last, so it arrives the same way a booking step
       does rather than snapping into place. */
    <form
      key={state.attempt}
      action={formAction}
      noValidate
      className="step-in max-w-md space-y-6"
    >
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm/relaxed text-rose-300">
          {state.message}
        </p>
      ) : null}

      <Field
        label="Reservation code"
        name="code"
        required
        defaultValue={state.values?.code}
        error={state.errors?.code}
        hint="On your confirmation, in the form TAV-8F42K."
      />
      <Field
        label="Mobile number or email"
        name="contact"
        required
        autoComplete="tel"
        defaultValue={state.values?.contact}
        error={state.errors?.contact}
        hint="Whichever you gave when you booked."
      />

      <SubmitButton pendingLabel="Looking…">Find My Booking</SubmitButton>
    </form>
  );
}
