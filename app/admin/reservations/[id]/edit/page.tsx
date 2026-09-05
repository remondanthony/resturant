import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ReservationForm } from "@/components/admin/ReservationForm";
import { editReservation } from "@/app/admin/actions";
import { requireStaffPage } from "@/lib/auth/dal";
import { getReservationById } from "@/lib/booking/reservations";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({
  params,
}: PageProps<"/admin/reservations/[id]/edit">) {
  await requireStaffPage();

  const { id } = await params;
  const reservation = await getReservationById(id);
  if (!reservation) notFound();

  // Bind the id server-side so the client cannot retarget another booking.
  const action = editReservation.bind(null, reservation.id);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Edit reservation"
        description={`${reservation.reservationCode} · ${reservation.firstName} ${reservation.lastName}`}
      />

      <div className="max-w-3xl">
        <ReservationForm
          action={action}
          excludeReservationId={reservation.id}
          submitLabel="Save Changes"
          defaults={{
            date: reservation.reservationDate,
            partySize: reservation.partySize,
            tableId: reservation.tableId ?? "",
            startTime: reservation.startTime.slice(0, 5),
            firstName: reservation.firstName,
            lastName: reservation.lastName,
            email: reservation.email,
            phone: reservation.phone,
            specialRequests: reservation.specialRequests ?? "",
          }}
        />
      </div>
    </div>
  );
}
