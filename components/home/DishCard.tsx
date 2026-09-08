import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { formatPrice } from "@/lib/format";
import type { Dish } from "@/data/menu";

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <article className="group reveal flex flex-col transition-transform duration-180 ease-standard hover:-translate-y-1">
      <ImageWithFallback
        src={dish.image}
        alt={dish.name}
        ratio="4 / 5"
        className="reveal-image w-full"
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        zoomOnHover
      />

      <div className="mt-7 flex flex-col">
        <span className="text-eyebrow font-medium uppercase text-copper-light">
          {dish.origin}
        </span>

        <div className="mt-4 flex items-baseline gap-4">
          <h3 className="font-display text-2xl font-light leading-tight text-cream-100 transition-colors duration-180 group-hover:text-amber-soft">
            {dish.name}
          </h3>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="lining-figures shrink-0 font-display text-xl font-light text-cream-200">
            {formatPrice(dish.price)}
          </span>
        </div>

        <p className="mt-4 text-sm/relaxed text-cream-400">{dish.description}</p>
      </div>
    </article>
  );
}
