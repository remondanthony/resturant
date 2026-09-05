import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Public pages only — nothing under /admin, and not the booking lookup. */
const routes = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/menu", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/reservations", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/private-dining", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/gallery", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${site.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
