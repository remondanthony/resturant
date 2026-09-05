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
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-7 text-[clamp(2.5rem,7vw,5rem)] font-light leading-[1] text-cream-50">
            {title}
          </h1>
          <div className="mt-8 max-w-prose text-base/relaxed text-cream-300 sm:text-lg/relaxed">
            {children}
          </div>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
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
