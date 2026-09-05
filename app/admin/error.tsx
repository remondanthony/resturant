"use client";

import { useEffect } from "react";

/**
 * Dashboard error boundary. Staff see a plain sentence and a way forward —
 * never a stack trace or a database message.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-espresso-950 px-5">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-light text-cream-50">
          Something went wrong
        </h1>
        <p className="mt-4 text-sm/relaxed text-cream-300">
          We couldn&rsquo;t load this page. This is usually temporary — try again, and if it keeps
          happening the restaurant&rsquo;s database may be unreachable.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-cream-400">
            Reference: <span className="lining-figures">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center border border-cream-100 bg-cream-100 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-espresso-950 transition-colors hover:bg-amber-soft"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center border border-line-strong px-5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
