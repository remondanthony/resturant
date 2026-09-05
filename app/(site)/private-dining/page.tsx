import type { Metadata } from "next";
import { PrivateDiningBooking } from "@/components/booking/PrivateDiningBooking";
import { getBookingWindow, getPrivateDiningRange } from "@/lib/booking/actions";
import { EditorialSplit } from "@/components/ui/EditorialSplit";
import { NumberedList, Note } from "@/components/ui/NumberedList";
import { PageHero } from "@/components/ui/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import { eventTypes, experiencePoints } from "@/data/private-dining";
import { RESERVATIONS_HREF, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Private Dining",
  description:
    "A separate room at TAVOLO for private dinners, birthdays, anniversaries, corporate gatherings and celebrations. Choose your room and book online.",
  alternates: { canonical: "/private-dining" },
};

/** Availability is live, so this page is never prerendered. */
export const dynamic = "force-dynamic";

export default async function PrivateDiningPage() {
  const [window, range] = await Promise.all([getBookingWindow(), getPrivateDiningRange()]);

  return (
    <>
      <PageHero
        eyebrow="By Arrangement"
        title="Private Dining"
        intro={<p>An intimate setting for memorable occasions.</p>}
        image="/images/din.png"
        imageAlt="The private dining room laid for a large party, candles down the centre of the table"
        imageClassName="[filter:brightness(2.1)_contrast(0.88)_saturate(1.2)]"
      >
        <TextLink href="#enquiry">Check availability</TextLink>
      </PageHero>

      {/* Intro */}
      <section aria-labelledby="pd-intro" className="relative">
        <div className="container-page grid gap-12 py-24 md:grid-cols-12 md:gap-10 lg:py-32">
          <div className="reveal md:col-span-4">
            <Eyebrow>The Room</Eyebrow>
            <h2
              id="pd-intro"
              className="mt-6 text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-cream-100"
            >
              A room of
              <span className="block italic text-cream-300">your own.</span>
            </h2>
          </div>
          <div className="reveal md:col-span-8 md:pl-6 lg:pl-16">
            <p className="font-display text-[clamp(1.5rem,2.8vw,2.25rem)] font-light leading-[1.35] text-cream-100">
              A separate space, its own service, and a menu written for the evening you have in
              mind rather than pulled off the shelf.
            </p>
            <div className="mt-8 space-y-5 text-base/relaxed text-cream-300">
              <p>
                Private dining at TAVOLO works the same way the main room does — short menus, long
                cooking, and a team who stay out of the way until they are needed. What changes is
                that the evening is planned with you beforehand instead of improvised around a
                booking.
              </p>
              <Note>
                Room capacity, minimum spends and availability are placeholders until the
                restaurant confirms them. Book the room below and we will come back to you with
                the real detail.
              </Note>
            </div>
          </div>
        </div>
      </section>

      {/* Event types */}
      <section
        aria-labelledby="event-types-heading"
        className="border-t border-line bg-espresso-900"
      >
        <div className="container-page grid gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <SectionHeading
                id="event-types-heading"
                eyebrow="Occasions"
                title={
                  <>
                    What the room is
                    <span className="block italic text-amber-soft">usually used for.</span>
                  </>
                }
              />
            </div>
          </div>
          <NumberedList entries={eventTypes} size="sm" className="lg:col-span-7 lg:pt-4" />
        </div>
      </section>

      {/* Experience */}
      <EditorialSplit
        id="pd-experience-heading"
        eyebrow="The Experience"
        title={
          <>
            Planned with you,
            <span className="block italic text-amber-soft">not around you.</span>
          </>
        }
        image="/images/Experience.png"
        imageAlt="The private room set for service before guests arrive: candles, glassware and olive branches down a laid table"
        imageClassName="[filter:brightness(1.9)_contrast(0.9)_saturate(1.15)]"
        ratio="3 / 2"
        imageSide="right"
      >
        <p>Private dining can include:</p>
        <ul className="space-y-5">
          {experiencePoints.map((point) => (
            <li key={point.title} className="border-t border-line pt-5">
              <h3 className="font-display text-xl font-light text-cream-100">{point.title}</h3>
              <p className="mt-2 text-base/relaxed text-cream-400">{point.description}</p>
            </li>
          ))}
        </ul>
      </EditorialSplit>

      {/* Enquiry */}
      <section
        id="enquiry"
        aria-labelledby="enquiry-heading"
        className="rail-anchor border-t border-line"
      >
        <div className="container-page grid gap-14 py-24 lg:grid-cols-12 lg:gap-20 lg:py-32">
          <div className="lg:col-span-5">
            <SectionHeading
              id="enquiry-heading"
              eyebrow="Book the room"
              title={
                <>
                  Reserve your
                  <span className="block italic text-amber-soft">private room.</span>
                </>
              }
            >
              <p>
                Choose your date, room and time, and tell us about the occasion. We will confirm
                the details with you by text.
              </p>
            </SectionHeading>

            <dl className="mt-10 space-y-6 border-t border-line pt-8 text-sm">
              <div>
                <dt className="text-eyebrow font-medium uppercase text-cream-400">Or call us</dt>
                <dd className="mt-2">
                  <a
                    href={site.contact.phoneHref}
                    className="lining-figures font-display text-xl font-light text-cream-100 transition-colors duration-180 hover:text-amber-soft"
                  >
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-eyebrow font-medium uppercase text-cream-400">
                  Booking a normal table?
                </dt>
                <dd className="mt-3">
                  <TextLink href={RESERVATIONS_HREF}>Reserve a Table</TextLink>
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7">
            <PrivateDiningBooking window={window} range={range} />
          </div>
        </div>
      </section>
    </>
  );
}
