import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { MapPlaceholder } from "@/components/contact/MapPlaceholder";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import { RESERVATIONS_HREF, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Find TAVOLO: address, phone, email and opening hours, plus a form for questions the phone cannot answer.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Find us."
        intro={
          <p>
            The quickest way to reach us is the phone. For anything that needs writing down, use
            the form below.
          </p>
        }
        image="/images/find.jpeg"
        imageAlt="A restaurant terrace on a lamplit street corner at dusk, tables set out on the cobbles"
      />

      {/* Details */}
      <section aria-labelledby="details-heading" className="border-b border-line">
        <div className="container-page py-20 lg:py-28">
          <h2 id="details-heading" className="sr-only">
            Restaurant information
          </h2>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            <div className="reveal">
              <DetailHeading icon={<MapPin aria-hidden="true" strokeWidth={1.25} className="size-4 text-copper-light" />}>
                Address
              </DetailHeading>
              <address className="mt-5 not-italic text-base/relaxed text-cream-300">
                {site.contact.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <p className="mt-4 text-xs text-cream-400">Placeholder address.</p>
            </div>

            <div className="reveal">
              <DetailHeading icon={<Phone aria-hidden="true" strokeWidth={1.25} className="size-4 text-copper-light" />}>
                Phone
              </DetailHeading>
              <p className="mt-5">
                <a
                  href={site.contact.phoneHref}
                  className="lining-figures font-display text-2xl font-light text-cream-100 transition-colors duration-180 hover:text-amber-soft"
                >
                  {site.contact.phone}
                </a>
              </p>
              <p className="mt-4 text-sm/relaxed text-cream-400">
                Answered during opening hours.
              </p>
            </div>

            <div className="reveal">
              <DetailHeading icon={<Mail aria-hidden="true" strokeWidth={1.25} className="size-4 text-copper-light" />}>
                Email
              </DetailHeading>
              <p className="mt-5">
                <a
                  href={`mailto:${site.contact.email}`}
                  className="break-all text-base text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors duration-180 hover:text-amber-soft"
                >
                  {site.contact.email}
                </a>
              </p>
              <p className="mt-4 text-sm/relaxed text-cream-400">
                We reply within one working day.
              </p>
            </div>

            <div className="reveal">
              <DetailHeading>Opening hours</DetailHeading>
              <dl className="mt-5 space-y-3 text-sm">
                {site.hours.map((entry) => (
                  <div
                    key={entry.days}
                    className="flex items-baseline justify-between gap-4 border-b border-line pb-3"
                  >
                    <dt className="text-cream-300">{entry.days}</dt>
                    <dd className="shrink-0 tabular-nums text-cream-400">{entry.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section aria-labelledby="location-heading" className="border-b border-line bg-espresso-900">
        <div className="container-page py-20 lg:py-28">
          <SectionHeading
            id="location-heading"
            eyebrow="Location"
            title="Getting here."
            className="max-w-xl"
          >
            <p>
              We are a short walk from the main square. The entrance is the unmarked door beside
              the archway — press the bell if it is before service.
            </p>
          </SectionHeading>

          <div className="reveal mt-12">
            <MapPlaceholder />
          </div>
        </div>
      </section>

      {/* Form */}
      <section aria-labelledby="contact-form-heading">
        <div className="container-page grid gap-14 py-24 lg:grid-cols-12 lg:gap-20 lg:py-32">
          <div className="lg:col-span-5">
            <SectionHeading
              id="contact-form-heading"
              eyebrow="Write to us"
              title={
                <>
                  Send us a
                  <span className="block italic text-amber-soft">message.</span>
                </>
              }
            >
              <p>
                Questions, feedback, lost property, press — anything that is not a booking. For a
                table, use the reservations page; for an event, use the private dining enquiry.
              </p>
            </SectionHeading>

            <div className="mt-10 flex flex-col gap-5 border-t border-line pt-8">
              <TextLink href={RESERVATIONS_HREF}>Reserve a Table</TextLink>
              <TextLink href="/private-dining">Book a private room</TextLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}

function DetailHeading({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-3 font-sans text-eyebrow font-medium uppercase text-cream-400">
      {icon}
      {children}
    </h3>
  );
}
