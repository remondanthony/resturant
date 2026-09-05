import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.name} — Dining Reimagined`,
    description: site.description,
    type: "website",
    url: site.url,
    siteName: site.name,
    images: [{ url: "/images/og.svg", width: 1200, height: 630, alt: site.name }],
  },
};

export const viewport: Viewport = {
  themeColor: "#080605",
  colorScheme: "dark",
};

/**
 * Document shell only. The public site's header and footer live in
 * `app/(site)/layout.tsx`, so the staff dashboard under /admin does not inherit
 * the marketing chrome.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      // Next asks for this so it can suppress smooth scrolling on route changes.
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-espresso-950 text-cream-100">{children}</body>
    </html>
  );
}
