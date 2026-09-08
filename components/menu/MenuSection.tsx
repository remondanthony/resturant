import { MenuItem } from "@/components/menu/MenuItem";
import { Eyebrow } from "@/components/ui/SectionHeading";
import type { MenuCategory } from "@/data/menu";

/**
 * A menu category. The heading column sticks on large screens so you always
 * know which part of the menu you are reading — the same split the homepage
 * uses for the Experience section.
 */
export function MenuSection({ category }: { category: MenuCategory }) {
  const headingId = `${category.slug}-heading`;

  return (
    <section
      id={category.slug}
      aria-labelledby={headingId}
      className="rail-anchor border-t border-line first:border-t-0"
    >
      <div className="grid gap-10 py-16 lg:grid-cols-12 lg:gap-14 lg:py-24">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+var(--rail-h)+2rem)]">
            <Eyebrow>{`0${menuIndex(category.slug)}`}</Eyebrow>
            <h2
              id={headingId}
              className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-cream-100"
            >
              {category.name}
            </h2>
            <p className="mt-4 max-w-xs text-sm/relaxed text-cream-400">{category.note}</p>
          </div>
        </div>

        <ul className="grid gap-10 lg:col-span-8 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-12">
          {category.items.map((item, index) => (
            <MenuItem key={item.slug} item={item} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Category order is fixed in the data file; this keeps the numerals in step. */
const order = ["antipasti", "pasta", "secondi", "contorni", "dolci", "wine-and-cocktails"];
function menuIndex(slug: string) {
  return order.indexOf(slug) + 1;
}
