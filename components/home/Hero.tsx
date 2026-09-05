import { Button } from "@/components/ui/Button";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { RESERVATIONS_HREF, site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      {/* Cinematic backdrop. The only preloaded image on the page. */}
      <div className="absolute inset-0 -z-10">
        <ImageWithFallback
          src="/images/background.png"
          alt="Candlelit tables in the TAVOLO dining room at night"
          fill
          imageClassName="object-center"
          sizes="100vw"
          preload
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-espresso-950 via-espresso-950/35 to-espresso-950/45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-espresso-950/80 via-espresso-950/15 to-transparent"
        />
      </div>

      <div className="container-page pb-16 pt-32 sm:pb-20 lg:pb-24">
        <div className="max-w-3xl">
          <span className="rise inline-flex items-center gap-4 text-eyebrow font-medium uppercase text-amber-glow [animation-delay:120ms]">
            <span aria-hidden="true" className="h-px w-8 bg-copper" />
            Est. 2014 · Modern Italian
          </span>

          <h1 className="rise mt-8 text-[clamp(3rem,10.5vw,8rem)] font-light leading-[0.94] text-cream-50 [animation-delay:220ms]">
            Dining
            <span className="block italic text-amber-soft">Reimagined.</span>
          </h1>

          <p className="rise mt-8 max-w-md text-lg/relaxed text-cream-200 [animation-delay:340ms] sm:text-xl/relaxed">
            {site.tagline}
          </p>

          <div className="rise mt-11 flex flex-col gap-4 [animation-delay:440ms] sm:flex-row sm:items-center">
            <Button href={RESERVATIONS_HREF} size="lg">
              Reserve a Table
            </Button>
            <Button href="/menu" size="lg" variant="outline">
              Explore Menu
            </Button>
          </div>
        </div>
      </div>

      {/* Standing detail along the bottom rule — hours, and a scroll cue. */}
      <div className="rise border-t border-line [animation-delay:600ms]">
        <div className="container-page flex items-center justify-between gap-6 py-5 text-eyebrow font-medium uppercase text-cream-400">
          <span>{site.hours[0].days.split(" — ")[0]} — Sunday</span>
          <span className="hidden sm:inline">Dinner from 17:30</span>
          <span aria-hidden="true" className="flex items-center gap-3">
            Scroll
            <span className="relative block h-8 w-px overflow-hidden bg-line-strong">
              <span className="absolute inset-x-0 top-0 h-3 animate-[scroll-cue_2.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-amber-glow" />
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
