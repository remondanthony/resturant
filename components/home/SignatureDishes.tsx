import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import { DishCard } from "@/components/home/DishCard";
import { signatureDishes } from "@/data/menu";

export function SignatureDishes() {
  return (
    <section
      aria-labelledby="signature-heading"
      className="relative border-t border-line bg-espresso-900"
    >
      <div className="container-page py-24 lg:py-36">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="signature-heading"
            eyebrow="Signature Dishes"
            title={
              <>
                From the <span className="italic text-cream-300">kitchen.</span>
              </>
            }
            className="max-w-xl"
          />
          <div className="reveal md:pb-3">
            <TextLink href="/menu">View the full menu</TextLink>
          </div>
        </div>

        {/* Alternating vertical offsets on desktop keep the row editorial
            rather than gridded. */}
        <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:mt-24 lg:grid-cols-4 lg:gap-x-6">
          {signatureDishes.map((dish, index) => (
            <li key={dish.slug} className={index % 2 === 1 ? "lg:translate-y-14" : ""}>
              <DishCard dish={dish} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
