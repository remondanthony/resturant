import Link from "next/link";
import { asc } from "drizzle-orm";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DayWeekSwitch } from "@/components/admin/DayWeekSwitch";
import { ReservationFilters } from "@/components/admin/ReservationFilters";
import { ReservationList } from "@/components/admin/ReservationList";
import { requireStaffPage } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import { listReservations } from "@/lib/booking/reservations";
import { addDays, formatLongDate, formatShortDate, restaurantToday } from "@/lib/booking/time";
import type { ReservationStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  await requireStaffPage();

  const params = await searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const view = single("view") === "week" ? "week" : "day";
  const search = single("search") ?? "";
  const status = (single("status") as ReservationStatus | undefined) ?? undefined;
  const tableId = single("tableId") || undefined;
  const page = Math.max(Number(single("page") ?? 1) || 1, 1);
  const anchorDate = single("date") || restaurantToday();

  // A search should look across all dates; browsing is scoped to the day or week.
  const searching = Boolean(search.trim());
  const range = searching
    ? {}
    : view === "week"
      ? { from: anchorDate, to: addDays(anchorDate, 6) }
      : { date: anchorDate };

  const [result, tables] = await Promise.all([
    listReservations({ ...range, status, tableId, search, page, pageSize: PAGE_SIZE }),
    getDb().select({ id: schema.tables.id, name: schema.tables.name }).from(schema.tables).orderBy(asc(schema.tables.sortOrder)),
  ]);

  function pageHref(next: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v) query.set(key, v);
    }
    query.set("page", String(next));
    return `/admin/reservations?${query.toString()}`;
  }

  function dateHref(date: string) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v) query.set(key, v);
    }
    query.set("date", date);
    query.delete("page");
    return `/admin/reservations?${query.toString()}`;
  }

  const step = view === "week" ? 7 : 1;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Reservations"
        description={
          searching
            ? `Search results for “${search}”`
            : view === "week"
              ? `${formatShortDate(anchorDate)} — ${formatShortDate(addDays(anchorDate, 6))}`
              : formatLongDate(anchorDate)
        }
        actions={
          <Link
            href="/admin/reservations/new"
            className="inline-flex min-h-11 items-center border border-cream-100 bg-cream-100 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-espresso-950 transition-colors hover:bg-amber-soft"
          >
            Add Reservation
          </Link>
        }
      />

      <ReservationFilters tables={tables} />

      {!searching ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={dateHref(addDays(anchorDate, -step))}
              className="inline-flex min-h-9 items-center border border-line px-3 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-300 transition-colors hover:border-amber-glow hover:text-amber-soft"
            >
              Previous
            </Link>
            <Link
              href={dateHref(restaurantToday())}
              className="inline-flex min-h-9 items-center border border-line px-3 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-300 transition-colors hover:border-amber-glow hover:text-amber-soft"
            >
              Today
            </Link>
            <Link
              href={dateHref(addDays(anchorDate, step))}
              className="inline-flex min-h-9 items-center border border-line px-3 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-300 transition-colors hover:border-amber-glow hover:text-amber-soft"
            >
              Next
            </Link>
          </div>
          <DayWeekSwitch view={view} />
        </div>
      ) : null}

      <div>
        <p className="lining-figures mb-4 text-xs text-cream-400">
          {result.total} {result.total === 1 ? "reservation" : "reservations"}
          {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
        </p>

        <ReservationList
          reservations={result.reservations}
          showDate={view === "week" || searching}
          emptyMessage={
            searching ? "Nothing matched that search." : "No reservations for this period."
          }
        />

        {result.pageCount > 1 ? (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
            {result.page > 1 ? (
              <Link
                href={pageHref(result.page - 1)}
                className="inline-flex min-h-10 items-center border border-line-strong px-4 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            {result.page < result.pageCount ? (
              <Link
                href={pageHref(result.page + 1)}
                className="inline-flex min-h-10 items-center border border-line-strong px-4 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
