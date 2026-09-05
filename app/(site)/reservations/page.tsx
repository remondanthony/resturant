import type { Metadata } from "next";
import Link from "next/link";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { PageHero } from "@/components/ui/PageHero";
import { getBookingWindow } from "@/lib/booking/actions";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reservations",
  description:
    "Book a table at TAVOLO. Choose your date, party size, table and time, and confirm in under a minute.",
  alternates: { canonical: "/reservations" },
};

/** Availability is live, so this page is never prerendered. */
export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const window = await getBookingWindow();

  return (
    <>
      <PageHero
        eyebrow="Reservations"
        title={
          <>
            Reserve Your <span className="italic text-amber-soft">Table.</span>
          </>
        }
        intro={<p>Choose your date, time and table.</p>}
        image="/images/hero-reservations.svg"
        imageAlt="A table set for two, glassware catching the light"
      />

      <section aria-labelledby="booking-heading" className="border-b border-line">
        <div className="container-page grid gap-14 py-20 lg:grid-cols-12 lg:gap-20 lg:py-28">
          <div className="lg:col-span-8">
            <h2 id="booking-heading" className="sr-only">
              Book a table
            </h2>
            <BookingFlow window={window} />
          </div>

          <aside className="lg:col-span-4">
            <div className="border border-line bg-espresso-900/40 p-6">
              <h2 className="font-display text-xl font-light text-cream-100">
                Prefer to call?
              </h2>
              <p className="mt-3 text-sm/relaxed text-cream-400">
                Someone picks up during service, and we can usually find something even at short
                notice.
              </p>
              <a
                href={site.contact.phoneHref}
                className="lining-figures mt-5 inline-flex min-h-11 items-center font-display text-xl font-light text-cream-100 transition-colors hover:text-amber-soft"
              >
                {site.contact.phone}
              </a>

              <div className="mt-8 border-t border-line pt-6">
                <h3 className="text-eyebrow font-medium uppercase text-cream-400">Opening hours</h3>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {site.hours.map((entry) => (
                    <div key={entry.days} className="flex justify-between gap-4">
                      <dt className="text-cream-300">{entry.days}</dt>
                      <dd className="lining-figures shrink-0 text-cream-400">{entry.time}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <h3 className="text-eyebrow font-medium uppercase text-cream-400">
                  Already booked?
                </h3>
                <Link
                  href="/reservations/manage"
                  className="mt-4 inline-flex min-h-11 items-center text-sm text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
                >
                  View or cancel your booking
                </Link>
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <h3 className="text-eyebrow font-medium uppercase text-cream-400">
                  Larger party?
                </h3>
                <Link
                  href="/private-dining"
                  className="mt-4 inline-flex min-h-11 items-center text-sm text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
                >
                  Book a private room
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
