import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ReservationForm } from "@/components/admin/ReservationForm";
import { createStaffReservation } from "@/app/admin/actions";
import { requireStaffPage } from "@/lib/auth/dal";
import { restaurantToday } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  await requireStaffPage();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Add reservation"
        description="For bookings taken by phone, at the door, or anywhere other than the website."
      />

      <div className="max-w-3xl">
        <ReservationForm
          action={createStaffReservation}
          submitLabel="Create Reservation"
          defaults={{
            date: restaurantToday(),
            partySize: 2,
            tableId: "",
            startTime: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            specialRequests: "",
          }}
        />
      </div>
    </div>
  );
}
