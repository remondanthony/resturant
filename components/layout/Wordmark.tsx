import Link from "next/link";
import { site } from "@/lib/site";

export function Wordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href="/"
      aria-label={`${site.name} — home`}
      className={`inline-flex items-baseline font-display font-light uppercase text-cream-100 transition-colors duration-180 hover:text-amber-soft ${
        size === "lg" ? "text-3xl tracking-[0.34em]" : "text-xl tracking-[0.34em] sm:text-2xl"
      } ${className}`}
    >
      {/* Trailing tracking is optical padding; trim it so the mark reads centred. */}
      <span className="-mr-[0.34em]">{site.name}</span>
    </Link>
  );
}
