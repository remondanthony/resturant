import type { ReactNode } from "react";

/** A single live figure. Values come from the database on every render. */
export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="border border-line bg-espresso-900/60 p-5">
      <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
        {label}
      </p>
      <p className="lining-figures mt-3 font-display text-4xl font-light leading-none text-cream-50">
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs text-cream-400">{detail}</p> : null}
    </div>
  );
}
