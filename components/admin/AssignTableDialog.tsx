"use client";

import { useRef, useState, useTransition } from "react";
import { useRealtime } from "@/components/admin/RealtimeProvider";
import { assignTable, loadAssignableTables } from "@/app/admin/actions";

type Assignable = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string;
  availableAtTime: boolean;
};

/**
 * Table assignment for a booking that arrived without one.
 *
 * Only tables that can seat the party are listed, and only those free at this
 * booking's own time can be chosen — the rest are shown greyed so staff can
 * see the whole room rather than wonder what is missing.
 */
export function AssignTableDialog({
  reservationId,
  guestName,
  partySize,
  label = "Assign Table",
}: {
  reservationId: string;
  guestName: string;
  partySize: number;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tables, setTables] = useState<Assignable[]>([]);
  const [closed, setClosed] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const { notify } = useRealtime();

  function open() {
    setError(null);
    setSelected("");
    dialogRef.current?.showModal();
    startLoading(async () => {
      const result = await loadAssignableTables(reservationId);
      setClosed(result.closed?.reason ?? null);
      setTables(result.tables);
    });
  }

  function confirm() {
    if (!selected) return;
    setError(null);
    startSaving(async () => {
      const result = await assignTable(reservationId, selected);
      if (!result.ok) {
        // "That table was just taken" belongs here, beside the list.
        setError(result.message);
        return;
      }
      notify(result.message);
      dialogRef.current?.close();
    });
  }

  const button =
    "inline-flex min-h-10 items-center justify-center whitespace-nowrap border px-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-colors duration-180 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${button} border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft`}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="assign-heading"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-line-strong bg-espresso-900 p-0 text-cream-100 backdrop:bg-espresso-950/80"
      >
        <div className="p-7">
          <h2 id="assign-heading" className="font-display text-2xl font-light text-cream-50">
            Assign a table
          </h2>
          <p className="mt-2 text-sm text-cream-400">
            {guestName} · {partySize} {partySize === 1 ? "guest" : "guests"}
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-cream-400">Checking the floor…</p>
          ) : closed ? (
            <p className="mt-6 border-l border-copper/60 pl-4 text-sm text-cream-300">{closed}</p>
          ) : tables.length === 0 ? (
            <p className="mt-6 border-l border-copper/60 pl-4 text-sm text-cream-300">
              No table in the room can seat {partySize}. Change the party size or the time first.
            </p>
          ) : (
            <ul className="mt-6 max-h-72 space-y-2 overflow-y-auto">
              {tables.map((table) => {
                const isSelected = table.id === selected;
                return (
                  <li key={table.id}>
                    <button
                      type="button"
                      disabled={!table.availableAtTime}
                      onClick={() => setSelected(table.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-4 border p-3.5 text-left transition-colors ${
                        isSelected
                          ? "border-amber-glow bg-amber-glow/[0.07]"
                          : "border-line hover:border-line-strong"
                      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line`}
                    >
                      <span>
                        <span className="block font-display text-lg font-light text-cream-50">
                          {table.name}
                        </span>
                        <span className="lining-figures mt-0.5 block text-xs text-cream-400">
                          {table.capacity} seats · {table.type} · {table.location}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 border px-2 py-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.16em] ${
                          table.availableAtTime
                            ? "border-emerald-400/45 text-emerald-300"
                            : "border-rose-400/40 text-rose-300"
                        }`}
                      >
                        {table.availableAtTime ? "Available" : "Unavailable"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? (
            <p
              role="alert"
              className="mt-5 border border-rose-400/40 bg-rose-400/5 p-3 text-sm text-rose-300"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={saving}
              className={`${button} w-full border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft sm:w-auto`}
            >
              Close
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving || !selected}
              className={`${button} w-full border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft sm:w-auto`}
            >
              {saving ? "Assigning…" : "Assign & Confirm"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
