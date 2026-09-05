"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

/**
 * Submit control that reads its pending state from the enclosing form, so the
 * loading state is real rather than a timer.
 */
export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full disabled:opacity-70 sm:w-auto">
      <span className="inline-flex items-center gap-3">
        {pending ? (
          <span
            aria-hidden="true"
            className="size-3.5 animate-spin rounded-pill border border-espresso-950/30 border-t-espresso-950"
          />
        ) : null}
        {pending ? pendingLabel : children}
      </span>
    </Button>
  );
}
