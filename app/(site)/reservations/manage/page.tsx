import type { Metadata } from "next";
import { ManageBooking } from "@/components/booking/ManageBooking";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Manage your booking",
  description: "View or cancel a TAVOLO reservation using your reservation code and mobile number.",
  // A private lookup surface — keep it out of search results.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ManageReservationPage() {
  return (
    <>
      <PageHero
        eyebrow="Your booking"
        title="Manage your reservation."
        intro={<p>Enter your reservation code and the mobile number you booked with.</p>}
        image="/images/reser.png"
        imageAlt="Candlelit tables through the dining room, a table laid with glassware in the foreground"
        imageClassName="[filter:brightness(2.1)_contrast(0.88)_saturate(1.2)]"
      />

      <section aria-labelledby="manage-heading" className="border-b border-line">
        <div className="container-page py-20 lg:py-28">
          <h2 id="manage-heading" className="sr-only">
            Find your booking
          </h2>
          <ManageBooking />
        </div>
      </section>
    </>
  );
}
