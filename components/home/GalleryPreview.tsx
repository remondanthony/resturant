import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import { galleryPreview } from "@/data/gallery";

export function GalleryPreview() {
  return (
    <section
      aria-labelledby="gallery-heading"
      className="relative border-t border-line bg-espresso-900"
    >
      <div className="container-page py-24 lg:py-36">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="gallery-heading"
            eyebrow="The Room"
            title={
              <>
                Evenings at <span className="italic text-cream-300">TAVOLO.</span>
              </>
            }
            className="max-w-xl"
          />
          <div className="reveal md:pb-3">
            <TextLink href="/gallery">See the gallery</TextLink>
          </div>
        </div>

        <GalleryGrid
          items={galleryPreview}
          className="mt-16 lg:mt-24"
          sizes="(min-width: 640px) 40vw, 92vw"
        />
      </div>
    </section>
  );
}
