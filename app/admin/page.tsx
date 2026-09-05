import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { FloorPlan } from "@/components/admin/FloorPlan";
import { ReservationList } from "@/components/admin/ReservationList";
import { StatCard } from "@/components/admin/StatCard";
import { requireStaffPage } from "@/lib/auth/dal";
import { getDashboardStats, getReservationsForDate } from "@/lib/booking/reservations";
import { getFloorPlan } from "@/lib/booking/floor";
import { formatLongDate, restaurantToday } from "@/lib/booking/time";

/** Live data on every request — no cached or invented statistics. */
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireStaffPage();

  const today = restaurantToday();
  const [stats, reservations, floor] = await Promise.all([
    getDashboardStats(),
    getReservationsForDate(today),
    getFloorPlan(today),
  ]);

  const live = reservations.filter((r) => r.status !== "cancelled");

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Today"
        description={formatLongDate(today)}
        actions={
          <Link
            href="/admin/reservations/new"
            className="inline-flex min-h-11 items-center border border-cream-100 bg-cream-100 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-espresso-950 transition-colors hover:bg-amber-soft"
          >
            Add Reservation
          </Link>
        }
      />

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Overview
        </h2>
        {/* Three figures, not a wall of them — what a small restaurant asks
            first thing on shift. Table counts live on the floor plan below. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Today's reservations" value={stats.todayReservations} />
          <StatCard label="Today's guests" value={stats.todayGuests} detail="Covers booked" />
          <StatCard
            label="Upcoming"
            value={stats.upcomingReservations}
            detail="Today onwards, not yet seated"
          />
        </div>
      </section>

      <section aria-labelledby="today-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="today-heading" className="font-display text-2xl font-light text-cream-100">
            Today&rsquo;s reservations
          </h2>
          <Link
            href="/admin/reservations"
            className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-300 transition-colors hover:text-amber-soft"
          >
            All reservations
          </Link>
        </div>
        <div className="mt-5">
          <ReservationList
            reservations={live}
            emptyMessage="Nothing booked for today yet."
          />
        </div>
      </section>

      <section aria-labelledby="floor-heading">
        <h2 id="floor-heading" className="font-display text-2xl font-light text-cream-100">
          Floor
        </h2>
        <p className="mt-2 text-xs text-cream-400">
          Status is derived from the book — it cannot drift out of step.
        </p>
        <div className="mt-6">
          <FloorPlan tables={floor} />
        </div>
      </section>
    </div>
  );
}
