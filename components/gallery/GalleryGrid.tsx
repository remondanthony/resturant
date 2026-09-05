import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { GalleryItem } from "@/data/gallery";

/**
 * The asymmetric editorial grid used by both the homepage preview and the
 * gallery page. Placement lives with the data; this only renders it.
 */
export function GalleryGrid({
  items,
  className = "",
  sizes = "(min-width: 640px) 45vw, 92vw",
}: {
  items: readonly GalleryItem[];
  className?: string;
  sizes?: string;
}) {
  return (
    <ul
      className={`grid grid-cols-1 gap-5 sm:grid-cols-12 sm:gap-x-6 sm:gap-y-16 ${className}`}
    >
      {items.map((item) => (
        <li key={item.src} className={item.className}>
          <ImageWithFallback
            src={item.src}
            alt={item.alt}
            ratio={item.ratio}
            className="reveal-image w-full"
            imageClassName={item.imageClassName}
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  );
}
