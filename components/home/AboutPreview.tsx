import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";

export function AboutPreview() {
  return (
    <section
      aria-labelledby="about-heading"
      className="relative border-t border-line bg-espresso-900"
    >
      <div className="container-page grid items-center gap-14 py-24 lg:grid-cols-12 lg:gap-20 lg:py-36">
        <div className="lg:col-span-6">
          <ImageWithFallback
            src="/images/table.png"
            alt="Guests gathered around a long table, mid-conversation"
            ratio="4 / 5"
            className="reveal-image w-full shadow-plate"
            sizes="(min-width: 1024px) 46vw, 92vw"
          />
        </div>

        <div className="reveal lg:col-span-6">
          <Eyebrow>Our Story</Eyebrow>
          <h2
            id="about-heading"
            className="mt-7 text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.12] text-cream-100"
          >
            A table is more than a place to eat.
            <span className="block italic text-amber-soft">
              It is a place to gather.
            </span>
          </h2>
          <div className="mt-8 space-y-5 text-base/relaxed text-cream-300 lg:text-lg/relaxed">
            <p>
              TAVOLO began with a single long table in a borrowed room and a
              standing invitation to whoever was free on a Sunday. The cooking
              came from family recipes; everything else came from the people who
              kept turning up.
            </p>
            <p>
              A decade later the room is ours and the table is longer, but the
              idea has not moved an inch. We cook so that people stay.
            </p>
          </div>
          <div className="mt-10">
            <TextLink href="/about">Our Story</TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}
