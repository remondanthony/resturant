"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { site } from "@/lib/site";

/**
 * Public site error boundary. Keeps the TAVOLO look and always offers the
 * phone number, because a guest hitting this may be trying to book.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site]", error);
  }, [error]);

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="warm-pool -z-10" />
      <div className="container-page flex min-h-[70svh] flex-col justify-center py-32 lg:py-44">
        <div className="max-w-2xl">
          <div className="rise [animation-delay:100ms]">
            <Eyebrow>Something went wrong</Eyebrow>
          </div>
          <h1 className="rise mt-7 text-[clamp(2.5rem,7vw,5rem)] font-light leading-[1] text-cream-50 [animation-delay:180ms]">
            A moment&rsquo;s trouble.
          </h1>
          <div className="rise mt-8 max-w-prose space-y-4 text-base/relaxed text-cream-300 [animation-delay:280ms] sm:text-lg/relaxed">
            <p>
              We could not load this page. It is usually temporary — try again, and if you were
              booking a table, call us and we will sort it out on the spot.
            </p>
            {error.digest ? (
              <p className="lining-figures text-sm text-cream-400">Reference: {error.digest}</p>
            ) : null}
          </div>
          <div className="rise mt-12 flex flex-col gap-4 [animation-delay:380ms] sm:flex-row sm:items-center">
            <Button onClick={reset} size="lg">
              Try Again
            </Button>
            <Button href={site.contact.phoneHref} size="lg" variant="outline">
              Call {site.contact.phone}
            </Button>
          </div>
          <p className="mt-8">
            <Link
              href="/"
              className="text-eyebrow font-medium uppercase text-cream-300 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
            >
              Back to the homepage
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
