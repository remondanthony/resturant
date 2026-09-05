"use server";

import { deliverEnquiry } from "@/lib/enquiries";
import { readForm, type FieldRule, type FormState } from "@/lib/forms";

const contactRules: Record<string, FieldRule> = {
  name: { label: "Name", required: true, maxLength: 80 },
  email: { label: "Email", required: true, type: "email", maxLength: 120 },
  phone: { label: "Phone", type: "tel", maxLength: 32 },
  message: { label: "Message", required: true, maxLength: 2000 },
};

async function handle(
  kind: "contact",
  rules: Record<string, FieldRule>,
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const attempt = previous.attempt + 1;
  const { values, errors } = readForm(formData, rules);

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", attempt, errors, values };
  }

  const outcome = await deliverEnquiry(kind, values);

  if (outcome.status === "sent") {
    return { status: "sent", attempt, reference: outcome.reference };
  }
  if (outcome.status === "unavailable") {
    return { status: "unavailable", attempt, values };
  }
  return { status: "error", attempt, values, message: outcome.message };
}

export async function submitContactMessage(previous: FormState, formData: FormData) {
  return handle("contact", contactRules, previous, formData);
}
