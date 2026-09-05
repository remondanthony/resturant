"use client";

import { useActionState } from "react";
import { saveTable } from "@/app/admin/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { initialFormState } from "@/lib/forms";
import type { TableRow } from "@/lib/db/schema";

/** Suggested types — free text, so staff can add their own without a migration. */
const TYPE_SUGGESTIONS = ["standard", "window", "booth", "outdoor", "private"];

export function TableForm({ table }: { table?: TableRow }) {
  const action = saveTable.bind(null, table?.id ?? null);
  const [state, formAction] = useActionState(action, initialFormState);
  const values = state.values ?? {};

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? (
        <p role="alert" className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm/relaxed text-rose-300">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Table name"
          name="name"
          required
          defaultValue={values.name ?? table?.name}
          error={state.errors?.name}
        />
        <Field
          label="Capacity"
          name="capacity"
          type="number"
          min={1}
          max={40}
          required
          defaultValue={values.capacity ?? String(table?.capacity ?? 2)}
          error={state.errors?.capacity}
          hint="Seats at this table."
        />
        <div>
          <label htmlFor="type" className="block text-eyebrow font-medium uppercase text-cream-300">
            Type
          </label>
          <input
            id="type"
            name="type"
            list="table-types"
            required
            defaultValue={values.type ?? table?.type ?? "standard"}
            className="mt-3 w-full min-h-12 rounded-xs border border-line-strong bg-espresso-900 px-4 py-3 text-base text-cream-100 outline-none transition-colors focus-visible:border-amber-glow"
          />
          <datalist id="table-types">
            {TYPE_SUGGESTIONS.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
          <p className="mt-2 text-xs text-cream-400">Pick a suggestion or type your own.</p>
          {state.errors?.type ? (
            <p className="mt-2 text-xs text-copper-light">{state.errors.type}</p>
          ) : null}
        </div>
        <Field
          label="Location"
          name="location"
          required
          defaultValue={values.location ?? table?.location ?? "Main room"}
          error={state.errors?.location}
          hint="Groups the table on the floor plan."
        />
        <Field
          label="Display order"
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={values.sortOrder ?? String(table?.sortOrder ?? 0)}
          error={state.errors?.sortOrder}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm text-cream-200">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={table ? table.isActive : true}
          className="size-4 accent-amber-glow"
        />
        In service — guests and staff can book this table
      </label>

      <SubmitButton pendingLabel="Saving…">{table ? "Save Table" : "Add Table"}</SubmitButton>
    </form>
  );
}
