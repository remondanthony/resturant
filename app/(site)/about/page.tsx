import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { EditorialSplit } from "@/components/ui/EditorialSplit";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { NumberedList, Note } from "@/components/ui/NumberedList";
import { PageHero } from "@/components/ui/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/SectionHeading";
import { approachPillars } from "@/data/about";
import { RESERVATIONS_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "How TAVOLO cooks and hosts: regional Italian dishes, seasonal produce, handmade pasta and unhurried evenings at the table.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About TAVOLO"
        title="Our Story"
        intro={
          <p>
            A dining room built around one idea — that the point of cooking well is to keep people
            at the table longer.
          </p>
        }
        image="/images/about.jpeg"
        imageAlt="A cook plating dishes at the pass beside tall windows, the kitchen working behind him in evening light"
        scrim="exposed"
      />

      {/* Philosophy */}
      <section aria-labelledby="philosophy-heading" className="relative">
        <div className="container-page grid gap-12 py-24 md:grid-cols-12 md:gap-10 lg:py-36">
          <div className="reveal md:col-span-4">
            <Eyebrow>Philosophy</Eyebrow>
          </div>
          <div className="reveal md:col-span-8 md:pl-6 lg:pl-16">
            <h2
              id="philosophy-heading"
              className="text-[clamp(2rem,4.6vw,3.5rem)] font-light leading-[1.12] text-cream-100"
            >
              A table is more than a place to eat.
              <span className="block italic text-amber-soft">It is a place to gather.</span>
            </h2>
            <div className="mt-8 grid gap-6 text-base/relaxed text-cream-300 sm:grid-cols-2 sm:gap-10 lg:text-lg/relaxed">
              <p>
                Everything we do follows from that. The menu is short so the kitchen can cook it
                properly. The room is dark and warm so an evening can stretch. Service is designed
                to be felt rather than noticed.
              </p>
              <p>
                We are not trying to impress anyone with the plate. We are trying to give people a
                reason to stay for another hour — which, in our experience, is a far harder thing to
                get right.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our approach */}
      <section
        aria-labelledby="approach-heading"
        className="relative border-t border-line bg-espresso-900"
      >
        <div className="container-page grid gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-36">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <Eyebrow>Our Approach</Eyebrow>
              <h2
                id="approach-heading"
                className="mt-6 text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.05] text-cream-100"
              >
                Four things we
                <span className="block italic text-amber-soft">work at daily.</span>
              </h2>
              <ImageWithFallback
                src="/images/daily.jpeg"
                alt="Hands lifting freshly cut pasta from a floured board, a rolling pin beside it"
                ratio="4 / 5"
                className="mt-10 w-full lg:mt-12"
                sizes="(min-width: 1024px) 38vw, 90vw"
              />
            </div>
          </div>

          <NumberedList entries={approachPillars} className="lg:col-span-7 lg:pt-4" />
        </div>
      </section>

      {/* The kitchen */}
      <EditorialSplit
        id="kitchen-heading"
        eyebrow="The Kitchen"
        title={
          <>
            Everything starts
            <span className="block italic text-amber-soft">before the doors open.</span>
          </>
        }
        image="/images/kitchen.jpeg"
        imageAlt="A cook shaking flour from freshly cut spaghetti over the bench"
        imageSide="right"
      >
        <p>
          The kitchen brigade arrives long before service. Pasta is rolled and cut, stocks go on,
          bread comes out of the overnight prove, and the day&rsquo;s deliveries are opened and
          argued over. What is not good enough goes back.
        </p>
        <p>
          By the time the first table sits, the evening has already been cooked once in
          preparation. Service itself is mostly composure — the same dishes, finished to order,
          plate after plate, without the pace ever showing in the room.
        </p>
        <Note>
          Chef and team details are held back until the restaurant confirms them. We would rather
          leave this blank than invent a name.
        </Note>
      </EditorialSplit>

      {/* Hospitality */}
      <section
        aria-labelledby="hospitality-heading"
        className="relative isolate overflow-hidden border-t border-line"
      >
        <ImageWithFallback
          src="/images/last.jpeg"
          alt="Two guests still talking across the table over the remains of dinner, the bar lit behind them"
          fill
          className="-z-10"
          sizes="100vw"
        />
        {/* Two scrims, measured. Under `xl` the copy spans most of the width
            and runs over the lit bar behind the guests, so a flat wash carries
            it; from `xl` the copy clears the bright half and the left-to-right
            falloff is enough on its own. The binding element is the body
            paragraph, which reaches furthest right. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-espresso-950/72 xl:bg-espresso-950/30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-espresso-950 via-espresso-950/70 to-espresso-950/25"
        />

        <div className="container-page py-28 lg:py-40">
          <SectionHeading
            id="hospitality-heading"
            eyebrow="Hospitality"
            title={
              <>
                The last hour is the one
                <span className="block italic text-amber-soft">people remember.</span>
              </>
            }
            className="max-w-2xl"
          >
            <p>
              Nobody remembers the third course as clearly as they remember the conversation that
              was still going when the plates were cleared. We build the whole evening backwards
              from that: the pacing, the lighting, the moment the coffee arrives.
            </p>
          </SectionHeading>

          <div className="reveal mt-12">
            <Button href={RESERVATIONS_HREF} size="lg">
              Reserve a Table
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
