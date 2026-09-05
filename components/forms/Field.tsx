import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Common = {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  hint?: string;
  className?: string;
  autoComplete?: string;
};

type FieldProps = Common &
  (
    | {
        as?: "input";
        type?: "text" | "email" | "tel" | "number" | "date" | "time" | "password";
        min?: number;
        max?: number;
        rows?: never;
        options?: never;
      }
    | { as: "textarea"; rows?: number; type?: never; min?: never; max?: never; options?: never }
    | { as: "select"; options: readonly string[]; type?: never; min?: never; max?: never; rows?: never }
  );

const control =
  "w-full min-h-12 rounded-xs border border-line-strong bg-espresso-900 px-4 py-3 text-base text-cream-100 " +
  "placeholder:text-cream-400 transition-colors duration-180 outline-none " +
  "hover:border-cream-400/40 focus-visible:border-amber-glow " +
  "aria-[invalid=true]:border-copper-light";

/**
 * One labelled form control with its hint and validation message wired up.
 * Errors come from the server action, so they render with or without
 * JavaScript.
 */
export function Field({
  label,
  name,
  required = false,
  error,
  defaultValue,
  hint,
  className = "",
  autoComplete,
  ...rest
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  const shared = {
    id: name,
    name,
    required,
    defaultValue,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: control,
  } as const;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-eyebrow font-medium uppercase text-cream-300">
        {label}
        {required ? null : <span className="ml-2 normal-case tracking-normal text-cream-400">optional</span>}
      </label>

      <div className="mt-3">
        {rest.as === "textarea" ? (
          <textarea {...shared} rows={rest.rows ?? 5} className={`${control} min-h-32 resize-y`} />
        ) : rest.as === "select" ? (
          <div className="relative">
            <select {...shared} className={`${control} appearance-none pr-12`}>
              <option value="">Please choose…</option>
              {rest.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.25}
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-cream-400"
            />
          </div>
        ) : (
          <input
            {...shared}
            type={rest.type ?? "text"}
            min={rest.min}
            max={rest.max}
            inputMode={rest.type === "number" ? "numeric" : undefined}
          />
        )}
      </div>

      {hint ? (
        <p id={hintId} className="mt-2 text-xs text-cream-400">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-2 text-xs text-copper-light">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Groups fields into a labelled block within a longer form. */
export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      {children}
    </fieldset>
  );
}
