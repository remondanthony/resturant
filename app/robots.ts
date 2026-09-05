import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * The public site is fully indexable; the dashboard and the guest's own
 * booking pages are not. `/reservations/manage` is excluded because it exists
 * only to look up a private booking.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/reservations/manage"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
