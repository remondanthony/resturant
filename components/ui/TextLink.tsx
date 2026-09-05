import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * An editorial link: uppercase micro-label, a rule that draws itself on hover,
 * and an arrow that steps forward. Used wherever a section hands off to a page.
 */
export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group/link inline-flex min-h-11 items-center gap-3 text-eyebrow font-medium uppercase text-cream-100 transition-colors duration-180 hover:text-amber-soft ${className}`}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-amber-glow transition-transform duration-260 ease-out-expo group-hover/link:scale-x-100"
        />
      </span>
      <ArrowRight
        aria-hidden="true"
        strokeWidth={1.25}
        className="size-4 transition-transform duration-260 ease-out-expo group-hover/link:translate-x-1"
      />
    </Link>
  );
}
