"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/admin/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { initialFormState } from "@/lib/forms";
import type { BookingConfig } from "@/lib/booking/config-defaults";

const DAYS = [
  { index: 0, name: "Sunday" },
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
];

const control =
  "min-h-11 rounded-xs border border-line-strong bg-espresso-900 px-3 text-sm text-cream-100 outline-none transition-colors focus-visible:border-amber-glow disabled:opacity-40";

/**
 * The booking rules. These are the same values the customer flow reads through
 * `getBookingConfig()`, so a change here takes effect on the public site too.
 */
export function SettingsForm({ config }: { config: BookingConfig }) {
  const [state, formAction] = useActionState(saveSettings, initialFormState);
  const values = state.values ?? {};

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-10">
      {state.status === "sent" ? (
        <p role="status" className="border border-emerald-400/40 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          Settings saved. Customer booking uses these rules immediately.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}

      <fieldset className="border-0 p-0">
        <legend className="font-display text-xl font-light text-cream-100">Opening hours</legend>
        <p className="mt-2 text-sm text-cream-400">
          Enter 00:00 as a closing time to mean midnight.
        </p>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {DAYS.map((day) => {
            const window = config.serviceHours[day.index];
            const closed = !window;
            return (
              <li key={day.index} className="flex flex-wrap items-center gap-4 py-3.5">
                <span className="w-28 shrink-0 text-sm text-cream-200">{day.name}</span>
                <label className="flex min-h-11 items-center gap-2 text-xs text-cream-400">
                  <input
                    type="checkbox"
                    name={`closed-${day.index}`}
                    defaultChecked={closed}
                    className="size-4 accent-amber-glow"
                  />
                  Closed
                </label>
                <span className="flex items-center gap-2">
                  <label htmlFor={`open-${day.index}`} className="sr-only">
                    {day.name} opening time
                  </label>
                  <input
                    id={`open-${day.index}`}
                    name={`open-${day.index}`}
                    type="time"
                    step={900}
                    defaultValue={window?.open ?? "17:30"}
                    className={control}
                  />
                  <span aria-hidden="true" className="text-cream-400">
                    —
                  </span>
                  <label htmlFor={`close-${day.index}`} className="sr-only">
                    {day.name} closing time
                  </label>
                  <input
                    id={`close-${day.index}`}
                    name={`close-${day.index}`}
                    type="time"
                    step={900}
                    defaultValue={window?.close === "24:00" ? "00:00" : (window?.close ?? "23:00")}
                    className={control}
                  />
                </span>
                {state.errors?.[`close-${day.index}`] ? (
                  <p className="w-full text-xs text-copper-light">
                    {state.errors[`close-${day.index}`]}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="font-display text-xl font-light text-cream-100">Booking rules</legend>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Field
            label="Booking window (days)"
            name="bookingHorizonDays"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={values.bookingHorizonDays ?? String(config.bookingHorizonDays)}
            error={state.errors?.bookingHorizonDays}
            hint="How far ahead guests can book."
          />
          <Field
            label="Time-slot interval (min)"
            name="slotIntervalMinutes"
            type="number"
            min={5}
            max={120}
            required
            defaultValue={values.slotIntervalMinutes ?? String(config.slotIntervalMinutes)}
            error={state.errors?.slotIntervalMinutes}
            hint="Gap between offered sittings."
          />
          <Field
            label="Minimum party size"
            name="minPartySize"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={values.minPartySize ?? String(config.minPartySize)}
            error={state.errors?.minPartySize}
          />
          <Field
            label="Maximum party size"
            name="maxPartySize"
            type="number"
            min={1}
            max={40}
            required
            defaultValue={values.maxPartySize ?? String(config.maxPartySize)}
            error={state.errors?.maxPartySize}
            hint="Larger parties are pointed at private dining."
          />
          <Field
            label="Last booking buffer (min)"
            name="lastBookingBufferMinutes"
            type="number"
            min={0}
            max={240}
            required
            defaultValue={values.lastBookingBufferMinutes ?? String(config.lastBookingBufferMinutes)}
            error={state.errors?.lastBookingBufferMinutes}
            hint="No sittings offered this close to closing."
            className="sm:col-span-2"
          />
        </div>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="font-display text-xl font-light text-cream-100">
          Reservation duration
        </legend>
        <p className="mt-2 text-sm text-cream-400">How long a table is held, by party size.</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <Field
            label="1–2 guests (min)"
            name="turnMinutesSmall"
            type="number"
            min={30}
            max={360}
            required
            defaultValue={values.turnMinutesSmall ?? String(config.turnMinutesSmall)}
            error={state.errors?.turnMinutesSmall}
          />
          <Field
            label="3–4 guests (min)"
            name="turnMinutesMedium"
            type="number"
            min={30}
            max={360}
            required
            defaultValue={values.turnMinutesMedium ?? String(config.turnMinutesMedium)}
            error={state.errors?.turnMinutesMedium}
          />
          <Field
            label="5+ guests (min)"
            name="turnMinutesLarge"
            type="number"
            min={30}
            max={360}
            required
            defaultValue={values.turnMinutesLarge ?? String(config.turnMinutesLarge)}
            error={state.errors?.turnMinutesLarge}
          />
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Saving…">Save Settings</SubmitButton>
    </form>
  );
}
