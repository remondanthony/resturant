import type { ReactNode } from "react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { Eyebrow } from "@/components/ui/SectionHeading";

type EditorialSplitProps = {
  eyebrow: string;
  title: ReactNode;
  /** Heading id, so the wrapping section can point aria-labelledby at it. */
  id: string;
  image: string;
  imageAlt: string;
  /** Extra classes on the image itself — exposure lift, object-position. */
  imageClassName?: string;
  ratio?: string;
  /** Which side the image sits on at large sizes. */
  imageSide?: "left" | "right";
  surface?: "base" | "raised";
  children: ReactNode;
  /** Footer content — usually a TextLink or Button. */
  action?: ReactNode;
};

/**
 * Image beside an editorial column. Used by About and Private Dining so those
 * pages share the homepage's rhythm rather than inventing a second one.
 */
export function EditorialSplit({
  eyebrow,
  title,
  id,
  image,
  imageAlt,
  imageClassName,
  ratio = "4 / 5",
  imageSide = "left",
  surface = "base",
  children,
  action,
}: EditorialSplitProps) {
  return (
    <section
      aria-labelledby={id}
      className={`relative border-t border-line ${surface === "raised" ? "bg-espresso-900" : ""}`}
    >
      <div className="container-page grid items-center gap-14 py-24 lg:grid-cols-12 lg:gap-20 lg:py-36">
        <div className={`lg:col-span-6 ${imageSide === "right" ? "lg:order-2" : ""}`}>
          <ImageWithFallback
            src={image}
            alt={imageAlt}
            ratio={ratio}
            className="reveal-image w-full shadow-plate"
            imageClassName={imageClassName}
            sizes="(min-width: 1024px) 46vw, 92vw"
          />
        </div>

        <div className="reveal lg:col-span-6">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            id={id}
            className="mt-7 text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.12] text-cream-100"
          >
            {title}
          </h2>
          <div className="mt-8 space-y-5 text-base/relaxed text-cream-300 lg:text-lg/relaxed">
            {children}
          </div>
          {action ? <div className="mt-10">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
