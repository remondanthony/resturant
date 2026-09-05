import type { Metadata } from "next";
import { MenuCategoryNav } from "@/components/menu/MenuCategoryNav";
import { MenuSection } from "@/components/menu/MenuSection";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { Note } from "@/components/ui/NumberedList";
import { dietaryLabels, menu, type DietaryCode } from "@/data/menu";
import { RESERVATIONS_HREF, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Antipasti, pasta, secondi, contorni, dolci, wine and cocktails at TAVOLO — a short menu rewritten as the markets change.",
  alternates: { canonical: "/menu" },
};

const categories = menu.map(({ slug, name }) => ({ slug, name }));

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="The Menu"
        title={
          <>
            From the <span className="italic text-amber-soft">kitchen.</span>
          </>
        }
        intro={<p>{site.tagline} A short list, cooked from what is at its best this week.</p>}
        image="/images/kit.png"
        imageAlt="The kitchen before service: copper lamps over a marble island of produce, the wood oven lit behind"
        imageClassName="[filter:brightness(2.1)_contrast(0.88)_saturate(1.2)]"
      />

      <MenuCategoryNav categories={categories} />

      <div className="container-page">
        <div className="reveal border-b border-line py-10">
          <Note>
            Sample menu. Dishes, descriptions and prices shown here are placeholders while the
            final menu is confirmed — they are not TAVOLO&rsquo;s live offering. Prices are in
            pounds sterling and include VAT.
          </Note>
        </div>

        {menu.map((category) => (
          <MenuSection key={category.slug} category={category} />
        ))}

        {/* Dietary key */}
        <section aria-labelledby="dietary-key" className="border-t border-line py-14">
          <h2 id="dietary-key" className="text-eyebrow font-medium uppercase text-cream-400">
            Dietary key
          </h2>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            {(Object.keys(dietaryLabels) as DietaryCode[]).map((code) => (
              <div key={code} className="flex items-center gap-3">
                <dt className="border border-line px-2 py-1 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
                  {code}
                </dt>
                <dd className="text-cream-300">{dietaryLabels[code]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-prose text-sm/relaxed text-cream-400">
            Please tell us about allergies or dietary needs when you book and again when you
            arrive, and the kitchen will advise on what it can adapt.
          </p>
        </section>
      </div>

      <section
        aria-labelledby="menu-cta"
        className="relative isolate overflow-hidden border-t border-line"
      >
        <div aria-hidden="true" className="warm-pool -z-10" />
        <div className="container-page py-24 text-center lg:py-32">
          <h2
            id="menu-cta"
            className="reveal mx-auto max-w-3xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] text-cream-50"
          >
            Come and eat with us.
          </h2>
          <div className="reveal mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href={RESERVATIONS_HREF} size="lg">
              Reserve a Table
            </Button>
            <Button href="/private-dining" size="lg" variant="outline">
              Private Dining
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
