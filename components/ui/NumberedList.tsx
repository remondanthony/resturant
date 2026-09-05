import type { ReactNode } from "react";

export type NumberedEntry = {
  index: string;
  title: string;
  description: string;
};

/**
 * Hairline-separated numbered entries — the homepage Experience pattern,
 * reused for approach pillars, event types and reservation steps.
 */
export function NumberedList({
  entries,
  className = "",
  size = "md",
}: {
  entries: readonly NumberedEntry[];
  className?: string;
  size?: "md" | "sm";
}) {
  return (
    <ol className={className}>
      {entries.map((entry) => (
        <li
          key={entry.index}
          className="reveal border-t border-line py-10 first:border-t-0 first:pt-0 lg:py-14"
        >
          <div className="flex gap-8 lg:gap-12">
            <span
              aria-hidden="true"
              className="lining-figures shrink-0 font-display text-xl font-light text-copper-light"
            >
              {entry.index}
            </span>
            <div>
              <h3
                className={
                  size === "md"
                    ? "text-[clamp(1.6rem,3.2vw,2.5rem)] font-light leading-[1.1] text-cream-100"
                    : "text-[clamp(1.35rem,2.4vw,1.85rem)] font-light leading-[1.15] text-cream-100"
                }
              >
                {entry.title}
              </h3>
              <p className="mt-4 max-w-xl text-base/relaxed text-cream-300 lg:text-lg/relaxed">
                {entry.description}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A short note set apart from the main copy — used for placeholder caveats. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="border-l border-copper/60 pl-5 text-sm/relaxed text-cream-400">{children}</p>
  );
}
