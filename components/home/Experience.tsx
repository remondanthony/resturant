import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { experiencePillars } from "@/data/experience";

export function Experience() {
  return (
    <section aria-labelledby="experience-heading" className="relative border-t border-line">
      <div className="container-page grid gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-36">
        {/* Left column stays with the reader as the three pillars scroll past.
            Deliberately free of reveal transforms so `sticky` behaves. */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <Eyebrow>The TAVOLO Experience</Eyebrow>
            <h2
              id="experience-heading"
              className="mt-6 text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.05] text-cream-100"
            >
              Three things we
              <span className="block italic text-amber-soft">never compromise.</span>
            </h2>
            <ImageWithFallback
              src="/images/craft.jpeg"
              alt="A cook finishing a plate at the pass under warm light"
              ratio="4 / 5"
              className="mt-10 w-full lg:mt-12"
              sizes="(min-width: 1024px) 38vw, 90vw"
            />
          </div>
        </div>

        <ol className="lg:col-span-7 lg:pt-4">
          {experiencePillars.map((pillar) => (
            <li
              key={pillar.index}
              className="reveal border-t border-line py-12 first:border-t-0 first:pt-0 lg:py-16"
            >
              <div className="flex gap-8 lg:gap-12">
                <span
                  aria-hidden="true"
                  className="lining-figures shrink-0 font-display text-xl font-light text-copper-light"
                >
                  {pillar.index}
                </span>
                <div>
                  <h3 className="text-[clamp(1.75rem,3.4vw,2.75rem)] font-light leading-[1.1] text-cream-100">
                    {pillar.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base/relaxed text-cream-300 lg:text-lg/relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
