import { Eyebrow } from "@/components/ui/SectionHeading";

export function Introduction() {
  return (
    <section
      aria-labelledby="introduction-heading"
      className="relative border-t border-line"
    >
      <div className="container-page grid gap-12 py-24 md:grid-cols-12 md:gap-10 lg:py-36">
        <div className="reveal md:col-span-4">
          <Eyebrow>The Table</Eyebrow>
          <h2
            id="introduction-heading"
            className="mt-6 text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-cream-100"
          >
            An Italian
            <span className="block italic text-cream-300">welcome.</span>
          </h2>
        </div>

        <div className="reveal md:col-span-8 md:pl-6 lg:pl-16">
          <p className="font-display text-[clamp(1.5rem,2.8vw,2.25rem)] font-light leading-[1.35] text-cream-100">
            Italian cooking has never been about complication. It is about a
            handful of things at their best, treated with respect, and shared
            without ceremony.
          </p>
          <div className="mt-8 grid gap-6 text-base/relaxed text-cream-300 sm:grid-cols-2 sm:gap-10">
            <p>
              Our kitchen works the way the great regional trattorie do — short
              menus, long cooking, nothing on the plate that has not earned its
              place. Pasta is rolled by hand each morning. Fish arrives whole.
              Bread is proved overnight and pulled from the oven through service.
            </p>
            <p>
              What we build around it is hospitality: a room that softens as the
              evening goes on, a pace that leaves space for conversation, and a
              team who notice everything without ever making a performance of it.
              That is the whole idea.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
