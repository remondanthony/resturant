import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/layout/Wordmark";
import { footerNavLinks, RESERVATIONS_HREF, site, socialLinks } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-espresso-900">
      <div className="container-page py-20 lg:py-28">
        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {/* Brand + contact */}
          <div className="lg:col-span-4">
            <Wordmark size="lg" />
            <p className="mt-6 max-w-xs text-sm/relaxed text-cream-400">
              {site.description}
            </p>

            <ul className="mt-9 space-y-4 text-sm text-cream-300">
              <li className="flex gap-3.5">
                <MapPin
                  aria-hidden="true"
                  strokeWidth={1.25}
                  className="mt-0.5 size-4 shrink-0 text-copper-light-light"
                />
                <address className="not-italic leading-relaxed">
                  {site.contact.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </li>
              <li>
                <a
                  href={site.contact.phoneHref}
                  className="flex min-h-11 items-center gap-3.5 transition-colors duration-180 hover:text-amber-soft"
                >
                  <Phone
                    aria-hidden="true"
                    strokeWidth={1.25}
                    className="size-4 shrink-0 text-copper-light"
                  />
                  {site.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="flex min-h-11 items-center gap-3.5 break-all transition-colors duration-180 hover:text-amber-soft"
                >
                  <Mail
                    aria-hidden="true"
                    strokeWidth={1.25}
                    className="size-4 shrink-0 text-copper-light"
                  />
                  {site.contact.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="lg:col-span-3">
            <FooterHeading>Opening Hours</FooterHeading>
            <dl className="mt-7 space-y-4 text-sm">
              {site.hours.map((entry) => (
                <div
                  key={entry.days}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-3.5"
                >
                  <dt className="text-cream-300">{entry.days}</dt>
                  <dd className="shrink-0 tabular-nums text-cream-400">{entry.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <FooterHeading>Navigate</FooterHeading>
            <nav aria-label="Footer">
              <ul className="mt-7 space-y-1 text-sm">
                {footerNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-11 items-center text-cream-300 transition-colors duration-180 hover:text-amber-soft"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Social + reservation CTA */}
          <div className="lg:col-span-3">
            <FooterHeading>Follow</FooterHeading>
            <ul className="mt-7 space-y-1 text-sm">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group/social flex min-h-11 items-center gap-2 text-cream-300 transition-colors duration-180 hover:text-amber-soft"
                  >
                    {link.label}
                    <ArrowUpRight
                      aria-hidden="true"
                      strokeWidth={1.25}
                      className="size-3.5 -translate-y-px opacity-0 transition-opacity duration-180 group-hover/social:opacity-100"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-9 border border-line p-6">
              <p className="font-display text-2xl font-light leading-snug text-cream-100">
                Join us this week.
              </p>
              <Button href={RESERVATIONS_HREF} className="mt-6 w-full">
                Reserve a Table
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-xs text-cream-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="uppercase tracking-[0.2em]">Modern Italian · London</p>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-eyebrow font-medium uppercase text-cream-400">
      {children}
    </h2>
  );
}
