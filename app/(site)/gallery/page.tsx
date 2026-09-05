import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/NumberedList";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { galleryChapters } from "@/data/gallery";
import { RESERVATIONS_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "The room, the kitchen and the table at TAVOLO — an editorial look at the restaurant across an evening of service.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title={
          <>
            Evenings at <span className="italic text-amber-soft">TAVOLO.</span>
          </>
        }
        intro={
          <p>
            Three chapters — the room as it fills, the kitchen through service, and what happens
            once the food is down.
          </p>
        }
        image="/images/eve.jpeg"
        imageAlt="A full dining room in the evening, guests at candlelit tables under warm lamps"
      />

      <div className="container-page py-10">
        <div className="reveal border-b border-line pb-10">
          <Note>
            Photography is being commissioned. Every frame below is a designed placeholder, not a
            photograph of the restaurant.
          </Note>
        </div>
      </div>

      {galleryChapters.map((chapter, index) => (
        <section
          key={chapter.slug}
          aria-labelledby={`${chapter.slug}-heading`}
          className={`border-t border-line ${index % 2 === 1 ? "bg-espresso-900" : ""}`}
        >
          <div className="container-page py-20 lg:py-28">
            <SectionHeading
              id={`${chapter.slug}-heading`}
              eyebrow={`0${index + 1} — ${chapter.title}`}
              title={chapter.title}
              className="max-w-xl"
            >
              <p>{chapter.intro}</p>
            </SectionHeading>

            <GalleryGrid
              items={chapter.items}
              className="mt-14 lg:mt-20"
              sizes="(min-width: 1024px) 42vw, (min-width: 640px) 46vw, 92vw"
            />
          </div>
        </section>
      ))}

      <section
        aria-labelledby="gallery-cta"
        className="relative isolate overflow-hidden border-t border-line"
      >
        <div aria-hidden="true" className="warm-pool -z-10" />
        <div className="container-page py-24 text-center lg:py-32">
          <h2
            id="gallery-cta"
            className="reveal mx-auto max-w-3xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] text-cream-50"
          >
            Better in person.
          </h2>
          <div className="reveal mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href={RESERVATIONS_HREF} size="lg">
              Reserve a Table
            </Button>
            <Button href="/menu" size="lg" variant="outline">
              Explore Menu
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
