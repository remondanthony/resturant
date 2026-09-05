"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Day / week toggle for the reservation calendar. */
export function DayWeekSwitch({ view }: { view: "day" | "week" }) {
  const params = useSearchParams();

  function href(next: "day" | "week") {
    const search = new URLSearchParams(params.toString());
    search.set("view", next);
    search.delete("page");
    return `/admin/reservations?${search.toString()}`;
  }

  const base =
    "inline-flex min-h-9 items-center border px-3.5 text-[0.625rem] font-medium uppercase tracking-[0.16em] transition-colors";

  return (
    <div role="group" aria-label="Calendar view" className="flex">
      {(["day", "week"] as const).map((option) => (
        <Link
          key={option}
          href={href(option)}
          aria-current={view === option ? "true" : undefined}
          className={`${base} ${
            view === option
              ? "border-amber-glow bg-amber-glow/10 text-amber-soft"
              : "border-line text-cream-400 hover:text-cream-100"
          } ${option === "day" ? "-mr-px" : ""}`}
        >
          {option}
        </Link>
      ))}
    </div>
  );
}
