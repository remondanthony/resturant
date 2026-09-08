"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useCallback, useState } from "react";

type ImageWithFallbackProps = {
  /** A missing or empty source is treated as a failure, never rendered raw. */
  src?: string | null;
  alt: string;
  /** CSS aspect-ratio for the frame, e.g. "4 / 5". */
  ratio?: string;
  /**
   * Stretch the frame over its nearest positioned ancestor instead of taking
   * part in flow. Use for full-bleed section backdrops.
   */
  fill?: boolean;
  /** Classes for the frame element. */
  className?: string;
  /** Classes for the image itself — usually object-position tweaks. */
  imageClassName?: string;
  sizes?: string;
  /** Preload + eagerly load. Use for the hero image only. */
  preload?: boolean;
  /** Scrim strength for images that sit behind text. */
  overlay?: "none" | "soft" | "strong" | "bottom";
  /** Zoom the image slightly when its nearest `.group` ancestor is hovered. */
  zoomOnHover?: boolean;
};

const overlayClasses: Record<NonNullable<ImageWithFallbackProps["overlay"]>, string> = {
  none: "",
  soft: "bg-espresso-950/35",
  strong: "bg-espresso-950/60",
  bottom:
    "bg-linear-to-t from-espresso-950 via-espresso-950/55 to-espresso-950/10",
};

/**
 * The single way images enter the page.
 *
 * Handles all four states — missing source, loading, loaded and failed — inside
 * a frame that always reserves its aspect ratio, so nothing shifts and the
 * browser's broken-image icon is never reachable.
 */
export function ImageWithFallback({
  src,
  alt,
  ratio,
  fill = false,
  className = "",
  imageClassName = "",
  sizes = "100vw",
  preload = false,
  overlay = "none",
  zoomOnHover = false,
}: ImageWithFallbackProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  const handleError = useCallback(() => setStatus("failed"), []);
  const handleLoad = useCallback(() => setStatus("loaded"), []);

  const hasSource = typeof src === "string" && src.trim().length > 0;
  const failed = !hasSource || status === "failed";

  return (
    <div
      className={[
        fill ? "absolute inset-0" : "relative",
        "isolate overflow-hidden bg-espresso-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {/* Loading plate. Sits beneath the image and is covered as it fades in. */}
      {!failed && status === "loading" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-br from-espresso-800 via-espresso-900 to-espresso-950"
        />
      ) : null}

      {hasSource && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload || undefined}
          loading={preload ? "eager" : "lazy"}
          fetchPriority={preload ? "high" : undefined}
          onLoad={handleLoad}
          onError={handleError}
          className={[
            // An editorial reveal, deliberately slower than interface feedback.
            // The photograph settles out of a slight zoom as it arrives rather
            // than simply switching on. The frame clips the overscan, so the
            // layout never moves.
            "object-cover transition-[opacity,transform] duration-700 ease-out-expo",
            status === "loaded" ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
            zoomOnHover ? "group-hover:scale-[1.04]" : "",
            imageClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : null}

      {failed ? <ImagePlaceholder /> : null}

      {overlay !== "none" ? (
        <div aria-hidden="true" className={`absolute inset-0 ${overlayClasses[overlay]}`} />
      ) : null}
    </div>
  );
}

/** The premium stand-in shown when an image is missing or fails to load. */
function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-espresso-900">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(70%_60%_at_68%_18%,rgba(232,163,74,0.16),transparent_65%),radial-gradient(60%_55%_at_10%_92%,rgba(184,98,44,0.14),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%223%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]"
      />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <ImageOff
          aria-hidden="true"
          strokeWidth={1}
          className="size-6 text-cream-300/50"
        />
        <span className="text-eyebrow font-medium text-cream-300/60 uppercase">
          Photography coming soon
        </span>
      </div>
    </div>
  );
}
