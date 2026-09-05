import type { ReactNode } from "react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  image: string;
  imageAlt: string;
  /** Extra classes on the image itself — exposure lift, object-position. */
  imageClassName?: string;
  /**
   * How hard to wash the photograph down. "lowKey" is for the very dark
   * plates most of these heroes use; "exposed" is for a photograph that is
   * already correctly lit and would be thrown away by the heavier wash.
   */
  scrim?: "lowKey" | "exposed";
  /** Extra content beneath the intro — usually buttons or a detail row. */
  children?: ReactNode;
};

/**
 * The opening of every page except the homepage: a cinematic plate behind an
 * editorial title block, sitting clear of the fixed header.
 */
const SCRIMS = {
  lowKey: {
    vertical:
      "from-espresso-950 via-espresso-950/68 to-espresso-950/72 xl:via-espresso-950/20 xl:to-espresso-950/30",
    horizontal:
      "from-espresso-950/85 via-espresso-950/25 to-transparent xl:from-espresso-950/94 xl:via-espresso-950/76 xl:to-espresso-950/6",
  },
  exposed: {
    vertical:
      "from-espresso-950/92 via-espresso-950/42 to-espresso-950/48 xl:via-espresso-950/8 xl:to-espresso-950/16",
    horizontal:
      "from-espresso-950/88 via-espresso-950/30 to-transparent xl:from-espresso-950/90 xl:via-espresso-950/52 xl:to-espresso-950/2",
  },
} as const;

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt,
  imageClassName,
  scrim = "lowKey",
  children,
}: PageHeroProps) {
  const { vertical, horizontal } = SCRIMS[scrim];
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <ImageWithFallback
        src={image}
        alt={imageAlt}
        fill
        className="-z-10"
        imageClassName={imageClassName}
        sizes="100vw"
        preload
      />
      {/* Two scrims, and every value here is measured rather than chosen by eye.

          Both sets share one shape. Under `xl` the copy spans most of the
          width, so no part of the frame is free of text and the wash has to be
          uniform. From `xl` the copy is confined to the left column, so the
          vertical wash drops right back and the horizontal one carries the
          contrast, leaving the right of the photograph near its true exposure.

          They differ in strength because the photographs do. The low-key
          plates sit around 0.02 mean luminance with ~95% of their pixels below
          0.1, and need the heavier wash; `about.jpeg` sits at 0.15 and is
          thrown away by it.

          The binding elements are the amber-glow eyebrow (small text, so
          4.5:1) at narrow widths and the h1 at 1280, where it still reaches
          into the lit half. Moving the breakpoint down to `lg` fails at 1024.
          Re-measure if you change any of it. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-linear-to-t ${vertical}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-linear-to-r ${horizontal}`}
      />

      <div className="container-page page-top pb-20 lg:pb-28">
        <div className="max-w-3xl">
          <span className="rise inline-flex items-center gap-4 text-eyebrow font-medium uppercase text-amber-glow [animation-delay:100ms]">
            <span aria-hidden="true" className="h-px w-8 bg-copper" />
            {eyebrow}
          </span>

          <h1 className="rise mt-7 text-[clamp(2.75rem,8vw,6rem)] font-light leading-[0.98] text-cream-50 [animation-delay:180ms]">
            {title}
          </h1>

          {intro ? (
            <div className="rise mt-8 max-w-xl text-lg/relaxed text-cream-200 [animation-delay:280ms]">
              {intro}
            </div>
          ) : null}

          {children ? <div className="rise mt-10 [animation-delay:380ms]">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
