import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RestaurantSchema } from "@/components/seo/RestaurantSchema";

/**
 * The public website's chrome. Everything a guest sees lives in this group;
 * /admin sits outside it and supplies its own shell.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <RestaurantSchema />
      <a
        href="#main"
        className="sr-only rounded-xs focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:bg-cream-100 focus:px-5 focus:py-3 focus:text-eyebrow focus:font-medium focus:uppercase focus:text-espresso-950"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
