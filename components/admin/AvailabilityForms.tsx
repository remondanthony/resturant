"use client";

import { useActionState, useState } from "react";
import { addClosure, blockTable } from "@/app/admin/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { initialFormState } from "@/lib/forms";

const control =
  "w-full min-h-12 rounded-xs border border-line-strong bg-espresso-900 px-4 py-3 text-base text-cream-100 outline-none transition-colors focus-visible:border-amber-glow disabled:opacity-50";

function TimeRange({
  allDay,
  onAllDayChange,
  allDayLabel,
  errors,
}: {
  allDay: boolean;
  onAllDayChange: (value: boolean) => void;
  allDayLabel: string;
  errors?: Record<string, string>;
}) {
  return (
    <>
      <label className="flex min-h-11 items-center gap-3 text-sm text-cream-200">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(event) => onAllDayChange(event.target.checked)}
          className="size-4 accent-amber-glow"
        />
        {allDayLabel}
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="startTime" className="block text-eyebrow font-medium uppercase text-cream-300">
            From
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            step={900}
            disabled={allDay}
            className={`${control} mt-3`}
          />
          {errors?.startTime ? (
            <p className="mt-2 text-xs text-copper-light">{errors.startTime}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="endTime" className="block text-eyebrow font-medium uppercase text-cream-300">
            Until
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            step={900}
            disabled={allDay}
            className={`${control} mt-3`}
          />
          {errors?.endTime ? (
            <p className="mt-2 text-xs text-copper-light">{errors.endTime}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Takes one table out of service for a date or a period of one. */
export function BlockTableForm({
  tables,
}: {
  tables: readonly { id: string; name: string; capacity: number }[];
}) {
  const [state, formAction] = useActionState(blockTable, initialFormState);
  const [allDay, setAllDay] = useState(true);

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-6">
      {state.status === "sent" ? (
        <p role="status" className="border border-emerald-400/40 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          Table blocked. Guests can no longer book it for that period.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="tableId" className="block text-eyebrow font-medium uppercase text-cream-300">
          Table
        </label>
        <select id="tableId" name="tableId" required className={`${control} mt-3`}>
          <option value="">Choose a table…</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name} — {table.capacity} seats
            </option>
          ))}
        </select>
        {state.errors?.tableId ? (
          <p className="mt-2 text-xs text-copper-light">{state.errors.tableId}</p>
        ) : null}
      </div>

      <Field label="Date" name="blockDate" type="date" required error={state.errors?.blockDate} />

      <TimeRange
        allDay={allDay}
        onAllDayChange={setAllDay}
        allDayLabel="Whole day"
        errors={state.errors}
      />

      <Field
        label="Reason"
        name="reason"
        defaultValue="Maintenance"
        error={state.errors?.reason}
        hint="Shown to staff on the floor plan."
      />

      <SubmitButton pendingLabel="Saving…">Block Table</SubmitButton>
    </form>
  );
}

/** Closes the whole restaurant for a date, or blocks a period of one. */
export function ClosureForm() {
  const [state, formAction] = useActionState(addClosure, initialFormState);
  const [allDay, setAllDay] = useState(true);

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-6">
      {state.status === "sent" ? (
        <p role="status" className="border border-emerald-400/40 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          Saved. That period is now closed to new bookings.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}

      <Field label="Date" name="closureDate" type="date" required error={state.errors?.closureDate} />

      <TimeRange
        allDay={allDay}
        onAllDayChange={setAllDay}
        allDayLabel="Closed all day"
        errors={state.errors}
      />

      <Field
        label="Reason"
        name="reason"
        defaultValue="Closed"
        error={state.errors?.reason}
        hint="For example: private event, staff holiday, maintenance."
      />

      <SubmitButton pendingLabel="Saving…">Save Closure</SubmitButton>
    </form>
  );
}
