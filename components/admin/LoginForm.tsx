"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/admin/actions";
import { Field } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { initialFormState } from "@/lib/forms";

/**
 * `next` comes from the query string, so it is attacker-controlled. Only a
 * single-slash absolute path within /admin is honoured — everything else,
 * including protocol-relative and absolute URLs, falls back to the dashboard.
 */
function safeNext(value: string | null): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  // Rejects "//evil.com" and "/\evil.com", both of which browsers treat as hosts.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/admin";
  return value;
}

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialFormState);
  const router = useRouter();
  const params = useSearchParams();

  // The action sets the cookie; navigate once it reports success.
  useEffect(() => {
    if (state.status === "sent") {
      router.replace(safeNext(params.get("next")));
      router.refresh();
    }
  }, [state.status, state.attempt, router, params]);

  return (
    <form key={state.attempt} action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? (
        <p
          role="alert"
          className="border border-rose-400/40 bg-rose-400/5 p-4 text-sm/relaxed text-rose-300"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="username"
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        error={state.errors?.password}
      />

      <SubmitButton pendingLabel="Signing in…">Sign In</SubmitButton>
    </form>
  );
}
