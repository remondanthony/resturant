import { site } from "@/lib/site";

/**
 * Restaurant structured data.
 *
 * Deliberately conservative: only facts that are actually true of this site are
 * emitted. Address, telephone, geo coordinates, price range, ratings and
 * reviews are all still placeholder content, so publishing them would be
 * telling search engines something false. Add them here once the real
 * restaurant details land in `lib/site.ts`.
 */
export function RestaurantSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: site.name,
    description: site.description,
    url: site.url,
    servesCuisine: "Italian",
    acceptsReservations: `${site.url}/reservations`,
    hasMenu: `${site.url}/menu`,
  };

  return (
    <script
      type="application/ld+json"
      // Serialised from the literal above; no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
