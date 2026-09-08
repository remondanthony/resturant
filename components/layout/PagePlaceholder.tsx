import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { RESERVATIONS_HREF, site } from "@/lib/site";

/**
 * Holding page for routes that arrive in a later phase. It exists so the
 * navigation is honest and the route segments are already in place — nothing
 * here anticipates future functionality.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="warm-pool -z-10" />
      <div className="container-page flex min-h-[70svh] flex-col justify-center py-32 lg:py-44">
        {/* Above the fold on arrival, so this rises on load like the page
            heroes rather than waiting on a scroll that may never come. */}
        <div className="max-w-2xl">
          <div className="rise [animation-delay:100ms]">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <h1 className="rise mt-7 text-[clamp(2.5rem,7vw,5rem)] font-light leading-[1] text-cream-50 [animation-delay:180ms]">
            {title}
          </h1>
          <div className="rise mt-8 max-w-prose text-base/relaxed text-cream-300 [animation-delay:280ms] sm:text-lg/relaxed">
            {children}
          </div>
          <div className="rise mt-12 flex flex-col gap-4 [animation-delay:380ms] sm:flex-row sm:items-center">
            <Button href={RESERVATIONS_HREF} size="lg">
              Reserve a Table
            </Button>
            <a
              href={site.contact.phoneHref}
              className="inline-flex min-h-14 items-center text-eyebrow font-medium uppercase text-cream-300 transition-colors duration-180 hover:text-amber-soft sm:px-4"
            >
              {site.contact.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
