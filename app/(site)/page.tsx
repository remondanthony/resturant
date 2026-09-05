import { Hero } from "@/components/home/Hero";
import { Introduction } from "@/components/home/Introduction";
import { SignatureDishes } from "@/components/home/SignatureDishes";
import { Experience } from "@/components/home/Experience";
import { AboutPreview } from "@/components/home/AboutPreview";
import { PrivateDining } from "@/components/home/PrivateDining";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { ReservationCta } from "@/components/home/ReservationCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Introduction />
      <SignatureDishes />
      <Experience />
      <AboutPreview />
      <PrivateDining />
      <GalleryPreview />
      <ReservationCta />
    </>
  );
}
