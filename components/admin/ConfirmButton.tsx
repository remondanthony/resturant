"use client";

import { useRef, useState, useTransition } from "react";
import { useRealtime } from "@/components/admin/RealtimeProvider";

/**
 * A button that asks before doing something irreversible, then runs a Server
 * Action. Uses a native <dialog> so focus trapping, Escape and the top layer
 * come from the platform.
 */
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel,
  action,
  tone = "default",
  className = "",
}: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  action: () => Promise<{ ok: boolean; message: string }>;
  tone?: "default" | "danger";
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { notify } = useRealtime();

  const base =
    "inline-flex min-h-10 items-center justify-center whitespace-nowrap border px-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-colors duration-180 disabled:opacity-50";
  const tones = {
    default: "border-line-strong text-cream-200 hover:border-amber-glow hover:text-amber-soft",
    danger: "border-rose-400/40 text-rose-300 hover:border-rose-400 hover:bg-rose-400/10",
  };

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        // Stays inside the dialog, next to the button that failed.
        setError(result.message);
        return;
      }
      notify(result.message);
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`${base} ${tones[tone]} ${className}`}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${title}-heading`}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] border border-line-strong bg-espresso-900 p-0 text-cream-100 backdrop:bg-espresso-950/80"
      >
        <div className="p-7">
          <h2 id={`${title}-heading`} className="font-display text-2xl font-light text-cream-50">
            {title}
          </h2>
          <p className="mt-3 text-sm/relaxed text-cream-300">{body}</p>

          {error ? (
            <p role="alert" className="mt-4 border border-rose-400/40 bg-rose-400/5 p-3 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
              className={`${base} ${tones.default} w-full sm:w-auto`}
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className={`${base} ${tone === "danger" ? tones.danger : "border-cream-100 bg-cream-100 text-espresso-950 hover:bg-amber-soft"} w-full sm:w-auto`}
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
