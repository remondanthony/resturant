import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { AssignTableDialog } from "@/components/admin/AssignTableDialog";
import { ReservationActions } from "@/components/admin/ReservationActions";
import { NotificationHistory } from "@/components/admin/NotificationHistory";
import { formatPhone } from "@/lib/booking/phone";
import { getNotificationsFor } from "@/lib/notifications/service";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireStaffPage } from "@/lib/auth/dal";
import { getReservationById } from "@/lib/booking/reservations";
import { formatLongDate, formatTime } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3.5">
      <dt className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-cream-100">{children}</dd>
    </div>
  );
}

export default async function ReservationDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/reservations/[id]">) {
  await requireStaffPage();

  const { id } = await params;
  const query = await searchParams;
  const reservation = await getReservationById(id);
  if (!reservation) notFound();

  const notifications = await getNotificationsFor(reservation.id);

  const guestName = `${reservation.firstName} ${reservation.lastName}`;
  const justSaved = query.created || query.updated;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={guestName}
        description={`${formatLongDate(reservation.reservationDate)} · ${formatTime(reservation.startTime)} · ${reservation.partySize} ${reservation.partySize === 1 ? "guest" : "guests"} · ${reservation.table?.name ?? "table not assigned"}`}
        actions={
          <>
            <Link
              href={`/admin/reservations/${reservation.id}/edit`}
              className="inline-flex min-h-11 items-center border border-cream-100 bg-cream-100 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-espresso-950 transition-colors hover:bg-amber-soft"
            >
              Edit
            </Link>
            <Link
              href="/admin/reservations"
              className="inline-flex min-h-11 items-center border border-line-strong px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
            >
              Back
            </Link>
          </>
        }
      />

      {justSaved ? (
        <p role="status" className="border border-emerald-400/40 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          {query.created ? "Reservation created." : "Reservation updated."}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="booking-heading" className="lg:col-span-2">
          <h2 id="booking-heading" className="font-display text-xl font-light text-cream-100">
            Booking
          </h2>
          <dl className="mt-4 grid gap-x-10 sm:grid-cols-2">
            <Detail label="Reservation code">
              <span className="lining-figures font-display text-xl">{reservation.reservationCode}</span>
            </Detail>
            <Detail label="Status">
              <StatusBadge status={reservation.status} />
            </Detail>
            <Detail label="Date">{formatLongDate(reservation.reservationDate)}</Detail>
            <Detail label="Time">
              <span className="lining-figures">
                {formatTime(reservation.startTime)} — {formatTime(reservation.endTime)}
              </span>
            </Detail>
            <Detail label="Guests">
              <span className="lining-figures">{reservation.partySize}</span>
            </Detail>
            <Detail label="Booking type">
              {reservation.bookingType === "private_dining" ? "Private dining" : "Normal"}
            </Detail>
            <Detail label="Table">
              {reservation.table ? (
                `${reservation.table.name} · ${reservation.table.capacity} seats · ${reservation.table.location}`
              ) : (
                <span className="text-rose-300">Not assigned</span>
              )}
            </Detail>
          </dl>

          <h2 className="mt-10 font-display text-xl font-light text-cream-100">Guest</h2>
          <dl className="mt-4 grid gap-x-10 sm:grid-cols-2">
            <Detail label="First name">{reservation.firstName}</Detail>
            <Detail label="Last name">{reservation.lastName}</Detail>
            <Detail label="Email">
              <a
                href={`mailto:${reservation.email}`}
                className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
              >
                {reservation.email}
              </a>
            </Detail>
            {/* Authorised staff see the full number here; lists show it masked. */}
            <Detail label="Mobile">
              <a
                href={`tel:${reservation.phone}`}
                className="lining-figures underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
              >
                {formatPhone(reservation.phone)}
              </a>
            </Detail>
          </dl>

          {reservation.specialRequests ? (
            <>
              <h2 className="mt-10 font-display text-xl font-light text-cream-100">
                Special requests
              </h2>
              <p className="mt-4 border-l border-copper/60 pl-4 text-sm/relaxed text-cream-200">
                {reservation.specialRequests}
              </p>
            </>
          ) : null}
        </section>

        <aside className="space-y-8">
          <div>
            <h2 className="font-display text-xl font-light text-cream-100">Actions</h2>
            <div className="mt-4 space-y-3">
              {!reservation.table ? (
                <AssignTableDialog
                  reservationId={reservation.id}
                  guestName={guestName}
                  partySize={reservation.partySize}
                />
              ) : null}
              <ReservationActions
                reservationId={reservation.id}
                status={reservation.status}
                guestName={guestName}
              />
            </div>

            <div className="mt-10">
              <NotificationHistory notifications={notifications} />
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl font-light text-cream-100">History</h2>
            <dl className="mt-4 text-xs">
              <Detail label="Booked via">
                {reservation.source === "staff" ? "Staff (phone or walk-in)" : "Website"}
              </Detail>
              <Detail label="Created">{reservation.createdAt.toLocaleString("en-GB")}</Detail>
              <Detail label="Last updated">{reservation.updatedAt.toLocaleString("en-GB")}</Detail>
              {reservation.arrivedAt ? (
                <Detail label="Arrived">{reservation.arrivedAt.toLocaleString("en-GB")}</Detail>
              ) : null}
              {reservation.completedAt ? (
                <Detail label="Completed">{reservation.completedAt.toLocaleString("en-GB")}</Detail>
              ) : null}
              {reservation.cancelledAt ? (
                <Detail label="Cancelled">{reservation.cancelledAt.toLocaleString("en-GB")}</Detail>
              ) : null}
              {reservation.noShowAt ? (
                <Detail label="No show">{reservation.noShowAt.toLocaleString("en-GB")}</Detail>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
