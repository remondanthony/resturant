import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";

export function PrivateDining() {
  return (
    <section aria-labelledby="private-dining-heading" className="relative isolate">
      {/* The photograph is composed with empty dark wall on the left and the
          lit table on the right. Narrow viewports crop to that dark left side
          so the copy — which spans the full width there — keeps its contrast;
          from `xl` the copy only occupies the left third, so the frame recentres
          and the laid table comes into view. */}
      <ImageWithFallback
        src="/images/private.png"
        alt="The private dining room, laid for a party of twelve"
        fill
        className="-z-10"
        imageClassName="object-left xl:object-center"
        sizes="100vw"
      />
      {/* Two scrims, as on the hero: a flat wash that carries the narrow
          layout, and the left-to-right falloff that shapes the wide one.

          These opacities are measured, not taste. The binding constraint is
          the cream-400 <dt> labels, which are small text and so need 4.5:1;
          they clear it by the narrowest margin at exactly 1280px, where the
          frame has just recentred but the copy still reaches the lit half of
          the room. Lightening either scrim, or moving the object-position
          breakpoint, drops that width below AA — re-measure if you change
          them. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-espresso-950/75 xl:bg-espresso-950/30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-espresso-950 via-espresso-950/70 to-espresso-950/10"
      />

      <div className="container-page py-28 lg:py-44">
        <div className="reveal max-w-xl border-l border-copper/60 pl-8 sm:pl-12">
          <Eyebrow>By Arrangement</Eyebrow>
          <h2
            id="private-dining-heading"
            className="mt-7 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-cream-50"
          >
            Private Dining
          </h2>
          <p className="mt-7 text-base/relaxed text-cream-200 sm:text-lg/relaxed">
            A separate room for eight to twenty-four, with its own entrance,
            its own service and a menu written for the evening you have in mind.
            Wine pairings and a chef&rsquo;s table are available on request.
          </p>
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-line pt-8 text-sm">
            <div>
              <dt className="text-eyebrow font-medium uppercase text-cream-400">
                Capacity
              </dt>
              <dd className="lining-figures mt-2 font-display text-xl font-light text-cream-100">
                8 — 24 guests
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow font-medium uppercase text-cream-400">
                Format
              </dt>
              <dd className="mt-2 font-display text-xl font-light text-cream-100">
                Set or tasting menu
              </dd>
            </div>
          </dl>
          <div className="mt-10">
            <TextLink href="/private-dining">Explore Private Dining</TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}
