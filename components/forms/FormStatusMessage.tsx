"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";
import type { FormState } from "@/lib/forms";

/**
 * The outcome banner. It is honest about what happened: a message is only
 * described as sent when a delivery endpoint actually accepted it.
 */
export function FormStatusMessage({ state, subject }: { state: FormState; subject: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Move focus to the outcome so it is announced and reachable after submitting.
  useEffect(() => {
    if (state.status === "sent" || state.status === "unavailable" || state.status === "error") {
      ref.current?.focus();
    }
  }, [state.status, state.attempt]);

  if (state.status === "idle" || state.status === "invalid") {
    return (
      <div aria-live="polite" className="sr-only">
        {state.status === "invalid"
          ? `${Object.keys(state.errors ?? {}).length} field needs attention. Check the messages below.`
          : ""}
      </div>
    );
  }

  const tone =
    state.status === "sent"
      ? { icon: CircleCheck, accent: "border-amber-glow/40", title: `${subject} received` }
      : state.status === "unavailable"
        ? { icon: Info, accent: "border-line-strong", title: "Not sent — no enquiry system connected yet" }
        : { icon: CircleAlert, accent: "border-copper-light/60", title: "Something went wrong" };

  const Icon = tone.icon;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className={`toast-in flex gap-4 border ${tone.accent} bg-espresso-900 p-6 outline-none`}
    >
      <Icon aria-hidden="true" strokeWidth={1.25} className="mt-0.5 size-5 shrink-0 text-amber-glow" />
      <div className="text-sm/relaxed">
        <p className="font-display text-xl font-light text-cream-100">{tone.title}</p>

        {state.status === "sent" ? (
          <p className="mt-2 text-cream-300">
            Your reference is <span className="text-cream-100">{state.reference}</span>. We will be in
            touch shortly.
          </p>
        ) : state.status === "unavailable" ? (
          <div className="mt-2 space-y-3 text-cream-300">
            <p>
              Your details passed validation, but this site has no enquiry backend connected yet, so
              nothing was sent and nothing was stored. We are not going to pretend otherwise.
            </p>
            <div>
              <p>Please reach us directly in the meantime:</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={site.contact.phoneHref}
                    className="lining-figures text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
                  >
                    {site.contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft [overflow-wrap:break-word]"
                  >
                    {site.contact.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-cream-300">
            {state.message} Nothing was sent. Please try again, or call us on{" "}
            <a
              href={site.contact.phoneHref}
              className="text-cream-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-amber-soft"
            >
              {site.contact.phone}
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
