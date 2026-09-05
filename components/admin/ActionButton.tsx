"use client";

import { useState, useTransition } from "react";
import { useRealtime } from "@/components/admin/RealtimeProvider";

/** Runs a Server Action with a real pending state and no double submissions. */
export function ActionButton({
  label,
  pendingLabel,
  action,
  variant = "outline",
  className = "",
}: {
  label: string;
  pendingLabel?: string;
  action: () => Promise<{ ok: boolean; message: string }>;
  variant?: "outline" | "solid";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { notify } = useRealtime();

  const base =
    "inline-flex min-h-10 items-center justify-center whitespace-nowrap border px-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-colors duration-180 disabled:opacity-50";
  const variants = {
    outline: "border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft",
    solid: "border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft",
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action();
            // Success is transient feedback; a failure stays put beside the
            // control so it can actually be read and acted upon.
            if (result.ok) notify(result.message);
            else setError(result.message);
          });
        }}
        className={`${base} ${variants[variant]} ${className}`}
      >
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-rose-300">
          {error}
        </span>
      ) : null}
    </span>
  );
}
