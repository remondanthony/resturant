"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { ReservationStatus } from "@/lib/db/schema";

const STATUSES: (ReservationStatus | "all")[] = [
  "all",
  "confirmed",
  "seated",
  "completed",
  "no_show",
  "cancelled",
];

/**
 * Filters push their state into the URL, so the server does the querying and a
 * filtered view can be bookmarked or shared. Nothing is filtered in the browser.
 */
export function ReservationFilters({
  tables,
}: {
  tables: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const currentSearch = params.get("search") ?? "";

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    router.push(`/admin/reservations?${next.toString()}`);
  }

  const control =
    "min-h-10 rounded-xs border border-line bg-espresso-900/70 px-3 text-xs text-cream-200 outline-none transition-colors hover:border-line-strong focus-visible:border-amber-glow";

  return (
    <div className="space-y-3">
      <form
        // Keyed on the URL so navigating back or clearing filters resets the input
        // without an effect syncing two copies of the same state.
        key={currentSearch}
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("search");
          apply({ search: typeof value === "string" ? value.trim() || null : null });
        }}
        role="search"
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-400"
          />
          <label htmlFor="reservation-search" className="sr-only">
            Search by guest name, reservation code or phone number
          </label>
          <input
            id="reservation-search"
            name="search"
            type="search"
            defaultValue={currentSearch}
            placeholder="Name, code or phone"
            className={`${control} w-full pl-9`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-10 shrink-0 items-center border border-line px-4 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-300 transition-colors hover:border-amber-glow hover:text-amber-soft"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filter-date" className="sr-only">
          Filter by date
        </label>
        <input
          id="filter-date"
          type="date"
          defaultValue={params.get("date") ?? ""}
          onChange={(event) => apply({ date: event.target.value || null })}
          className={`${control} min-w-36 grow basis-36 sm:grow-0`}
        />

        <label htmlFor="filter-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="filter-status"
          defaultValue={params.get("status") ?? "all"}
          onChange={(event) => apply({ status: event.target.value === "all" ? null : event.target.value })}
          className={`${control} min-w-32 grow basis-32 capitalize sm:grow-0`}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status.replace("_", " ")}
            </option>
          ))}
        </select>

        <label htmlFor="filter-table" className="sr-only">
          Filter by table
        </label>
        <select
          id="filter-table"
          defaultValue={params.get("tableId") ?? ""}
          onChange={(event) => apply({ tableId: event.target.value || null })}
          className={`${control} min-w-32 grow basis-32 sm:grow-0`}
        >
          <option value="">All tables</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name}
            </option>
          ))}
        </select>

        {params.size > 0 ? (
          <button
            type="button"
            onClick={() => router.push("/admin/reservations")}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-400 transition-colors hover:text-amber-soft"
          >
            <X aria-hidden="true" strokeWidth={1.5} className="size-3" />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
