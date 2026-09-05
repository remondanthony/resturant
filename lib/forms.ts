/**
 * Shared form plumbing for the contact and private dining enquiry forms.
 *
 * Validation runs on the server inside the form action, so it works with or
 * without JavaScript and there is one implementation rather than two.
 */

export type FieldErrors = Record<string, string>;

export type FormStatus =
  /** Untouched. */
  | "idle"
  /** Validation failed; `errors` says which fields and why. */
  | "invalid"
  /** Handed to the configured delivery endpoint, which accepted it. */
  | "sent"
  /** Valid, but no delivery endpoint is configured — nothing was sent. */
  | "unavailable"
  /** A delivery endpoint is configured and it failed. */
  | "error";

export type FormState = {
  status: FormStatus;
  /** Increments on every submission so the form can remount and restore input. */
  attempt: number;
  errors?: FieldErrors;
  /** Submitted values, echoed back so nothing is retyped after a failure. */
  values?: Record<string, string>;
  /** Read-only payload an action wants to hand back to the UI. */
  data?: Record<string, string>;
  /** Reference shown in the success state. */
  reference?: string;
  /** Human-readable detail for the error state. */
  message?: string;
};

export const initialFormState: FormState = { status: "idle", attempt: 0 };

/* ------------------------------------------------------------------ rules */

export type FieldRule = {
  label: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number" | "date" | "time" | "password";
  maxLength?: number;
  min?: number;
  max?: number;
};

/** Deliberately permissive — enough to catch typos, not to reject real people. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL = /^[+()\-.\s\d]{7,24}$/;

function validateField(value: string, rule: FieldRule): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (rule.maxLength && trimmed.length > rule.maxLength) {
    return `${rule.label} must be ${rule.maxLength} characters or fewer.`;
  }
  if (rule.type === "email" && !EMAIL.test(trimmed)) {
    return "Enter an email address we can reply to.";
  }
  if (rule.type === "tel" && !TEL.test(trimmed)) {
    return "Enter a phone number using digits, spaces and + only.";
  }
  if (rule.type === "number") {
    const n = Number(trimmed);
    if (!Number.isInteger(n)) return `${rule.label} must be a whole number.`;
    if (rule.min !== undefined && n < rule.min) return `${rule.label} must be at least ${rule.min}.`;
    if (rule.max !== undefined && n > rule.max) return `${rule.label} must be ${rule.max} or fewer.`;
  }
  if (rule.type === "date") {
    const date = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Enter a valid date.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return "Choose a date that has not already passed.";
  }
  return null;
}

/**
 * Reads and validates every declared field from the submitted FormData.
 * Returns the trimmed values alongside any errors.
 */
export function readForm(
  formData: FormData,
  rules: Record<string, FieldRule>,
): { values: Record<string, string>; errors: FieldErrors } {
  const values: Record<string, string> = {};
  const errors: FieldErrors = {};

  // A hand-crafted request can send anything. Treat a non-FormData payload as
  // an empty submission rather than letting it throw.
  if (typeof (formData as FormData | undefined)?.get !== "function") {
    for (const [name, rule] of Object.entries(rules)) {
      values[name] = "";
      if (rule.required) errors[name] = `${rule.label} is required.`;
    }
    return { values, errors };
  }

  for (const [name, rule] of Object.entries(rules)) {
    const raw = formData.get(name);
    const value = typeof raw === "string" ? raw.trim() : "";
    values[name] = value;

    const error = validateField(value, rule);
    if (error) errors[name] = error;
  }

  return { values, errors };
}
