import { dietaryLabels, type MenuItem as MenuItemData } from "@/data/menu";
import { formatPrice } from "@/lib/format";

/**
 * One line of the menu: name, leader rule, price, then the description
 * beneath. Deliberately not a card — a menu should read like a menu.
 */
export function MenuItem({ item }: { item: MenuItemData }) {
  return (
    <li className="reveal">
      <div className="flex items-baseline gap-4">
        <h3 className="font-display text-xl font-light leading-tight text-cream-100 sm:text-2xl">
          {item.name}
        </h3>
        <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-line" />
        <span className="flex shrink-0 items-baseline gap-2">
          <span className="lining-figures font-display text-lg font-light text-cream-200 sm:text-xl">
            {formatPrice(item.price)}
          </span>
          {item.unit ? (
            <span className="text-eyebrow font-medium uppercase text-cream-400">{item.unit}</span>
          ) : null}
        </span>
      </div>

      <p className="mt-3 max-w-prose text-sm/relaxed text-cream-400">{item.description}</p>

      {item.dietary?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {item.dietary.map((code) => (
            <li
              key={code}
              className="border border-line px-2 py-1 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400"
            >
              <span aria-hidden="true">{code}</span>
              <span className="sr-only">{dietaryLabels[code]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
