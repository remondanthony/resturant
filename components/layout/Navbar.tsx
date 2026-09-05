import { DesktopNav } from "@/components/layout/DesktopNav";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ReserveButton } from "@/components/layout/ReserveButton";
import { Wordmark } from "@/components/layout/Wordmark";
import { site } from "@/lib/site";

/**
 * Fixed header. It starts transparent over the hero and settles into an opaque
 * bar as the page scrolls, driven by a CSS scroll timeline — no scroll listener.
 * Browsers without support get the settled bar. The header itself stays a Server
 * Component; only the two nav lists need the client for their active state.
 */
export function Navbar() {
  return (
    <header className="header-settle fixed inset-x-0 top-0 z-50 border-b border-line bg-espresso-950/88 backdrop-blur-md">
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-8">
        <Wordmark />

        <DesktopNav />

        <div className="hidden items-center gap-8 lg:flex">
          <a
            href={site.contact.phoneHref}
            className="text-eyebrow font-medium uppercase text-cream-300 transition-colors duration-180 hover:text-amber-soft"
          >
            {site.contact.phone}
          </a>
          <ReserveButton />
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
