"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { loadAvailability } from "@/app/admin/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { formatTime } from "@/lib/booking/time";
import { initialFormState, type FormState } from "@/lib/forms";

type AvailableTable = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string;
  slots: string[];
};

export type ReservationFormDefaults = {
  date: string;
  partySize: number;
  tableId: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
};

/**
 * Staff booking form, for phone bookings and walk-ins.
 *
 * Table and time options come from `loadAvailability`, which calls the same
 * availability engine the public booking flow uses — a table already booked by
 * a customer simply is not offered here.
 */
export function ReservationForm({
  action,
  defaults,
  excludeReservationId,
  submitLabel,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  defaults: ReservationFormDefaults;
  excludeReservationId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const values = state.values ?? {};

  const [date, setDate] = useState(defaults.date);
  const [partySize, setPartySize] = useState(defaults.partySize);
  const [tableId, setTableId] = useState(defaults.tableId);
  const [startTime, setStartTime] = useState(defaults.startTime);

  const [tables, setTables] = useState<AvailableTable[]>([]);
  const [closed, setClosed] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!date || !partySize || partySize < 1) return;
    startLoading(async () => {
      const result = await loadAvailability(date, partySize, excludeReservationId);
      setClosed(result.closed?.reason ?? null);
      setTables(result.tables);
    });
  }, [date, partySize, excludeReservationId]);

  const selected = tables.find((t) => t.id === tableId);
  // Keep the current booking's own slot selectable when editing.
  const slots = selected
    ? selected.slots.includes(defaults.startTime) || defaults.tableId !== tableId
      ? selected.slots
      : [defaults.startTime, ...selected.slots].sort()
    : [];

  const control =
    "w-full min-h-12 rounded-xs border border-line-strong bg-espresso-900 px-4 py-3 text-base text-cream-100 outline-none transition-colors focus-visible:border-amber-glow";

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-8">
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm/relaxed text-rose-300">
          {state.message}
        </p>
      ) : null}

      <fieldset className="border-0 p-0">
        <legend className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
          Booking
        </legend>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-eyebrow font-medium uppercase text-cream-300">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${control} mt-3`}
              aria-invalid={state.errors?.date ? true : undefined}
            />
            {state.errors?.date ? (
              <p className="mt-2 text-xs text-copper-light">{state.errors.date}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="partySize" className="block text-eyebrow font-medium uppercase text-cream-300">
              Guests
            </label>
            <input
              id="partySize"
              name="partySize"
              type="number"
              min={1}
              max={200}
              required
              inputMode="numeric"
              value={partySize}
              onChange={(event) => {
                setPartySize(Number(event.target.value));
                setTableId("");
                setStartTime("");
              }}
              className={`${control} mt-3`}
              aria-invalid={state.errors?.partySize ? true : undefined}
            />
            {state.errors?.partySize ? (
              <p className="mt-2 text-xs text-copper-light">{state.errors.partySize}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="tableId" className="block text-eyebrow font-medium uppercase text-cream-300">
              Table
            </label>
            <select
              id="tableId"
              name="tableId"
              required
              value={tableId}
              onChange={(event) => {
                setTableId(event.target.value);
                setStartTime("");
              }}
              disabled={loading || tables.length === 0}
              className={`${control} mt-3 disabled:opacity-60`}
              aria-invalid={state.errors?.tableId ? true : undefined}
            >
              <option value="">
                {loading
                  ? "Checking availability…"
                  : closed
                    ? "Closed that day"
                    : tables.length === 0
                      ? "Nothing available"
                      : "Choose a table…"}
              </option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} — {table.capacity} seats · {table.location}
                </option>
              ))}
            </select>
            {state.errors?.tableId ? (
              <p className="mt-2 text-xs text-copper-light">{state.errors.tableId}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="startTime" className="block text-eyebrow font-medium uppercase text-cream-300">
              Time
            </label>
            <select
              id="startTime"
              name="startTime"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={!selected}
              className={`${control} mt-3 disabled:opacity-60`}
              aria-invalid={state.errors?.startTime ? true : undefined}
            >
              <option value="">{selected ? "Choose a time…" : "Pick a table first"}</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTime(slot)}
                </option>
              ))}
            </select>
            {state.errors?.startTime ? (
              <p className="mt-2 text-xs text-copper-light">{state.errors.startTime}</p>
            ) : null}
          </div>
        </div>

        {closed ? (
          <p className="mt-4 border-l border-copper/60 pl-4 text-sm text-cream-300">{closed}</p>
        ) : null}
        {!closed && !loading && tables.length === 0 && date ? (
          <p className="mt-4 border-l border-copper/60 pl-4 text-sm text-cream-300">
            No table can take {partySize} {partySize === 1 ? "guest" : "guests"} that day. Try
            another date, or free up a table first.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
          Guest
        </legend>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Field
            label="First name"
            name="firstName"
            required
            defaultValue={values.firstName ?? defaults.firstName}
            error={state.errors?.firstName}
          />
          <Field
            label="Last name"
            name="lastName"
            required
            defaultValue={values.lastName ?? defaults.lastName}
            error={state.errors?.lastName}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={values.email ?? defaults.email}
            error={state.errors?.email}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            required
            defaultValue={values.phone ?? defaults.phone}
            error={state.errors?.phone}
          />
          <Field
            label="Special requests"
            name="specialRequests"
            as="textarea"
            rows={3}
            defaultValue={values.specialRequests ?? defaults.specialRequests}
            error={state.errors?.specialRequests}
            className="sm:col-span-2"
          />
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
