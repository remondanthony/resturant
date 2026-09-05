import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatTime } from "@/lib/booking/time";
import { maskPhone } from "@/lib/booking/phone";
import type { ReservationWithTable } from "@/lib/booking/reservations";

/**
 * The service sheet.
 *
 * Reads in one pass: time, guest, party and table, status, and a single way
 * in. Every action lives on the detail page, so a row stays scannable and the
 * same layout works on a phone without a horizontal scroll.
 *
 * Status comes straight from the reservation row, so this list can never
 * disagree with any other view.
 */
export function ReservationList({
  reservations,
  showDate = false,
  emptyMessage = "No reservations.",
}: {
  reservations: readonly ReservationWithTable[];
  showDate?: boolean;
  emptyMessage?: string;
}) {
  if (reservations.length === 0) {
    return (
      <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-cream-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {reservations.map((reservation) => {
        const dimmed =
          reservation.status === "cancelled" || reservation.status === "no_show";

        return (
          <li key={reservation.id}>
            {/* Phones stack: time, then guest, then status and the one action.
                From `sm` up the same information sits on a single line. */}
            <div className={`py-4 ${dimmed ? "opacity-55" : ""}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <p className="lining-figures shrink-0 font-display text-xl font-light leading-none text-cream-50 sm:w-24 sm:text-2xl">
                  {formatTime(reservation.startTime)}
                </p>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/reservations/${reservation.id}`}
                    className="block truncate font-display text-lg font-light text-cream-100 transition-colors hover:text-amber-soft sm:text-xl"
                  >
                    {reservation.firstName} {reservation.lastName}
                  </Link>
                  <p className="lining-figures mt-0.5 truncate text-xs text-cream-400">
                    {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}
                    {" · "}
                    {/* Masked here; the full number is on the detail page. */}
                    {maskPhone(reservation.phone)}
                    {showDate ? ` · ${reservation.reservationDate}` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] font-medium uppercase tracking-[0.16em]">
                    {reservation.bookingType === "private_dining" ? (
                      <span className="text-amber-glow">Private dining</span>
                    ) : null}
                    <span className={reservation.table ? "text-cream-300" : "text-rose-300"}>
                      {reservation.table ? reservation.table.name : "Table not assigned"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge status={reservation.status} className="shrink-0" />
                  <Link
                    href={`/admin/reservations/${reservation.id}`}
                    className="inline-flex min-h-9 shrink-0 items-center border border-line-strong px-3.5 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
                  >
                    View
                    <span className="sr-only">
                      {" "}
                      reservation for {reservation.firstName} {reservation.lastName}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
