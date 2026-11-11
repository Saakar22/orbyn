"use client";

import { useActionState, useState, type FormEvent } from "react";
import type { z } from "zod";
import type { AuthFormState } from "@/app/actions/auth";
import { fieldErrors } from "@/lib/auth-schemas";

type Action = (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;

/**
 * Shared plumbing for the auth forms: validate in the browser with the same schema the server
 * uses, submit through a server action, and show whichever errors are most recent.
 */
export function useAuthForm<Shape>(action: Action, schema: z.ZodType<Shape>, read: (data: FormData) => unknown) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [local, setLocal] = useState<Record<string, string> | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const parsed = schema.safeParse(read(new FormData(event.currentTarget)));
    if (parsed.success) {
      setLocal(null);
      return;
    }
    event.preventDefault();
    const errors = fieldErrors(parsed.error);
    setLocal(errors);
    // Move focus to the first field that needs attention.
    const first = Object.keys(errors)[0];
    event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  return {
    formAction,
    pending,
    onSubmit,
    /** Field errors: the browser's if it stopped the submit, otherwise the server's. */
    fields: local ?? state?.fields ?? {},
    error: local ? undefined : state?.error,
    sent: Boolean(state?.sent),
    /** Clear a field's message as soon as the person edits it. */
    clear: (name: string) => setLocal((current) => (current && current[name] ? { ...current, [name]: "" } : current)),
  };
}
