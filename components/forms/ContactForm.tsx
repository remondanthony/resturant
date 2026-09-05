"use client";

import { useActionState, useEffect } from "react";
import { submitContactMessage } from "@/app/actions";
import { Field } from "@/components/forms/Field";
import { FormStatusMessage } from "@/components/forms/FormStatusMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { initialFormState } from "@/lib/forms";

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, initialFormState);
  const values = state.values ?? {};

  // Send focus to the first field that needs attention, so the message is
  // reachable rather than just visible.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = Object.keys(state.errors ?? {})[0];
    if (!first) return;
    const field = document.getElementById(first);
    if (field instanceof HTMLElement) field.focus({ preventScroll: false });
  }, [state.status, state.attempt, state.errors]);

  return (
    <div className="space-y-8">
      <FormStatusMessage state={state} subject="Message" />

      {state.status === "sent" ? null : (
        <form
          // Remounting on each attempt restores what was typed via defaultValue.
          key={state.attempt}
          action={formAction}
          noValidate
          className="space-y-7"
        >
          <div className="grid gap-7 sm:grid-cols-2">
            <Field
              label="Name"
              name="name"
              required
              autoComplete="name"
              defaultValue={values.name}
              error={state.errors?.name}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={values.email}
              error={state.errors?.email}
            />
          </div>

          <Field
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
            error={state.errors?.phone}
          />

          <Field
            label="Message"
            name="message"
            as="textarea"
            required
            defaultValue={values.message}
            error={state.errors?.message}
            hint="Tell us what you need — a question, feedback, or anything else."
          />

          <SubmitButton pendingLabel="Sending…">Send Message</SubmitButton>
        </form>
      )}
    </div>
  );
}
