import { MapPin } from "lucide-react";
import { site } from "@/lib/site";

/**
 * A drawn stand-in for the map, in the TAVOLO palette rather than a grey tile.
 *
 * When the real location is confirmed, replace the SVG below with the map
 * provider's embed and keep this component's shape — the surrounding page
 * makes no other assumptions about it.
 */
export function MapPlaceholder() {
  return (
    <figure className="relative isolate overflow-hidden border border-line bg-espresso-900">
      <div className="aspect-16/10 w-full sm:aspect-21/9">
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 500"
          preserveAspectRatio="xMidYMid slice"
          className="size-full"
        >
          <defs>
            <linearGradient id="map-base" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#161209" />
              <stop offset="1" stopColor="#0a0806" />
            </linearGradient>
            <radialGradient id="map-glow" cx="0.5" cy="0.5" r="0.55">
              <stop offset="0" stopColor="#e8a34a" stopOpacity="0.2" />
              <stop offset="1" stopColor="#b4622c" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1200" height="500" fill="url(#map-base)" />

          {/* Streets */}
          <g stroke="#f2eada" strokeOpacity="0.09" fill="none" strokeWidth="1">
            <path d="M0 130h1200M0 300h1200M0 420h1200" />
            <path d="M180 0v500M420 0v500M760 0v500M980 0v500" />
            <path d="M0 60 380 0M820 500 1200 380" strokeOpacity="0.06" />
          </g>
          {/* The one road the restaurant sits on */}
          <path d="M0 300h1200" stroke="#c4703a" strokeOpacity="0.4" strokeWidth="2" fill="none" />
          {/* Blocks */}
          <g fill="#f2eada" fillOpacity="0.03">
            <rect x="200" y="150" width="200" height="130" />
            <rect x="440" y="150" width="300" height="130" />
            <rect x="200" y="320" width="200" height="80" />
            <rect x="780" y="320" width="180" height="80" />
            <rect x="1000" y="150" width="180" height="130" />
          </g>

          <rect width="1200" height="500" fill="url(#map-glow)" />
        </svg>
      </div>

      {/* Pin */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          {/* Label above the pin so it never sits on the highlighted road. */}
          <span className="bg-espresso-950/80 px-3 py-1 text-eyebrow font-medium uppercase text-cream-200">
            {site.name}
          </span>
          <span className="relative grid size-11 place-items-center rounded-pill border border-amber-glow/50 bg-espresso-950/80">
            <MapPin aria-hidden="true" strokeWidth={1.25} className="size-5 text-amber-glow" />
          </span>
        </div>
      </div>

      <figcaption className="border-t border-line bg-espresso-950/70 px-6 py-4 text-xs/relaxed text-cream-400">
        Illustrative only — an interactive map goes here once the final address is
        confirmed.
      </figcaption>
    </figure>
  );
}
