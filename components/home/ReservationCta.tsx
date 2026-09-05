import { Button } from "@/components/ui/Button";
import { RESERVATIONS_HREF, site } from "@/lib/site";

export function ReservationCta() {
  return (
    <section
      aria-labelledby="reservation-cta-heading"
      className="relative isolate overflow-hidden border-t border-line"
    >
      <div aria-hidden="true" className="warm-pool -z-10" />

      <div className="container-page py-28 text-center lg:py-40">
        <span className="reveal inline-flex items-center gap-4 text-eyebrow font-medium uppercase text-amber-glow">
          <span aria-hidden="true" className="h-px w-8 bg-copper" />
          Reservations
          <span aria-hidden="true" className="h-px w-8 bg-copper" />
        </span>

        <h2
          id="reservation-cta-heading"
          className="reveal mx-auto mt-8 max-w-4xl text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.98] text-cream-50"
        >
          Your table is
          <span className="italic text-amber-soft"> waiting.</span>
        </h2>

        <p className="reveal mx-auto mt-8 max-w-md text-base/relaxed text-cream-300 sm:text-lg/relaxed">
          Book online in a moment, or call us and we will find you something
          good — even at short notice.
        </p>

        <div className="reveal mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href={RESERVATIONS_HREF} size="lg">
            Reserve a Table
          </Button>
          <a
            href={site.contact.phoneHref}
            className="inline-flex min-h-14 items-center px-4 text-eyebrow font-medium uppercase text-cream-300 transition-colors duration-180 hover:text-amber-soft"
          >
            {site.contact.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
