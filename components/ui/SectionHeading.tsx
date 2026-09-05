import type { ReactNode } from "react";

type SectionHeadingProps = {
  /** Uppercase micro-label above the heading. */
  eyebrow?: string;
  title: ReactNode;
  /** Id for the heading element — the target of the section's aria-labelledby. */
  id?: string;
  /** Heading level — sections use h2; keep the page hierarchy intact. */
  as?: "h2" | "h3";
  align?: "start" | "center";
  className?: string;
  /** Optional supporting paragraph beneath the title. */
  children?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  id,
  as: Tag = "h2",
  align = "start",
  className = "",
  children,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={[
        "reveal flex max-w-3xl flex-col",
        centered ? "items-center text-center mx-auto" : "items-start",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Tag
        id={id}
        className={
          Tag === "h2"
            ? "mt-6 text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.05] text-cream-100"
            : "mt-6 text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-cream-100"
        }
      >
        {title}
      </Tag>
      {children ? (
        <div
          className={`mt-6 max-w-prose text-base/relaxed text-cream-300 sm:text-lg/relaxed ${
            centered ? "text-center" : ""
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Copper micro-label with a leading rule — the recurring editorial marker. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-4 text-eyebrow font-medium uppercase text-amber-glow ${className}`}
    >
      <span aria-hidden="true" className="h-px w-8 bg-copper" />
      {children}
    </span>
  );
}
