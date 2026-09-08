import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "lg";

/*
 * The lift on hover and the press on active are the whole tactility budget for
 * a button: a couple of pixels, on the ui step, with the standard curve. The
 * `:active` rule is written after `:hover` so a press still reads as a press
 * while the pointer is over the control.
 */
const base =
  "group/btn inline-flex items-center justify-center gap-2.5 rounded-xs font-sans font-medium uppercase " +
  "text-eyebrow whitespace-nowrap transition-[background-color,color,border-color,transform] duration-180 " +
  "ease-standard hover:-translate-y-0.5 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-cream-100 text-espresso-950 hover:bg-amber-soft",
  outline:
    "border border-line-strong text-cream-100 hover:border-amber-glow hover:text-amber-soft hover:bg-cream-100/[0.03]",
  ghost:
    "text-cream-200 hover:text-amber-soft",
};

/* Touch targets stay at or above 48px tall at every size. */
const sizes: Record<Size, string> = {
  md: "min-h-12 px-6 py-3.5",
  lg: "min-h-14 px-9 py-4.5",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)
  | ({ href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">)
);

/** tel:, mailto:, #hash and absolute URLs are plain anchors, not routes. */
function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:|#)/.test(href);
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");

  if (props.href !== undefined) {
    const { href, ...rest } = props;

    if (isExternalHref(href)) {
      return (
        <a href={href} className={classes} {...(rest as ComponentProps<"a">)}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
