"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";
import { useAuthForm } from "./use-auth-form";

const CONTROL = "h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]";
const CHECK = "mt-0.5 size-4 shrink-0 rounded border-input accent-[oklch(0.34_0.13_274)]";

function FormError({ message }: { message?: string }) {
  return message ? <Banner tone="danger">{message}</Banner> : null;
}

/** Text inputs are controlled so a failed submit keeps what was typed (React resets action forms otherwise). */
function useValues<Keys extends string>(initial: Record<Keys, string>) {
  const [values, setValues] = useState(initial);
  return { values, set: (key: Keys, value: string) => setValues((current) => ({ ...current, [key]: value })) };
}

export function LoginForm({ next }: { next?: string }) {
  const form = useAuthForm(loginAction, loginSchema, (data) => ({
    email: data.get("email"),
    password: data.get("password"),
    remember: data.get("remember") === "on",
  }));
  const { values, set } = useValues({ email: "", password: "" });
  const [remember, setRemember] = useState(true);

  return (
    <form action={form.formAction} onSubmit={form.onSubmit} noValidate className="space-y-4">
      <FormError message={form.error} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormField label="Email" error={form.fields.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          className={CONTROL}
          value={values.email}
          onChange={(event) => (set("email", event.target.value), form.clear("email"))}
        />
      </FormField>
      <FormField
        label="Password"
        error={form.fields.password}
        aside={
          <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          name="password"
          autoComplete="current-password"
          className={CONTROL}
          value={values.password}
          onChange={(event) => (set("password", event.target.value), form.clear("password"))}
        />
      </FormField>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="remember" className={CHECK} checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        <span>
          Remember me <span className="text-muted-foreground">for 30 days on this device</span>
        </span>
      </label>
      <Button type="submit" size="xl" className="w-full" loading={form.pending}>
        Log in
      </Button>
    </form>
  );
}

export function SignupForm({ fromDemo }: { fromDemo: boolean }) {
  const form = useAuthForm(signupAction, signupSchema, (data) => ({
    name: data.get("name"),
    email: data.get("email"),
    password: data.get("password"),
    businessName: String(data.get("businessName") ?? "").trim() || undefined,
    terms: data.get("terms") === "on",
  }));
  const { values, set } = useValues({ name: "", email: "", password: "", businessName: "" });
  const [terms, setTerms] = useState(false);
  const [demo, setDemo] = useState<"keep" | "fresh">("keep");

  return (
    <form action={form.formAction} onSubmit={form.onSubmit} noValidate className="space-y-4">
      <FormError message={form.error} />

      {fromDemo ? (
        <fieldset className="rounded-xl border bg-accent/50 p-3">
          <legend className="px-1 text-[13px] font-semibold">You&rsquo;re in a demo workspace</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "keep", title: "Keep this demo workspace", body: "Your account takes over the sample data and anything you added." },
                { value: "fresh", title: "Start fresh", body: "A new, empty workspace. The demo is left behind." },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border bg-card p-3 text-[13px] transition-colors",
                  demo === option.value ? "border-primary ring-2 ring-ring/25" : "hover:border-foreground/25",
                )}
              >
                <input
                  type="radio"
                  name="demo"
                  value={option.value}
                  checked={demo === option.value}
                  onChange={() => setDemo(option.value)}
                  className="mt-0.5 size-4 shrink-0 accent-[oklch(0.34_0.13_274)]"
                />
                <span>
                  <span className="block font-medium">{option.title}</span>
                  <span className="mt-0.5 block leading-snug text-muted-foreground">{option.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <FormField label="Full name" error={form.fields.name}>
        <Input
          name="name"
          autoComplete="name"
          autoFocus
          className={CONTROL}
          value={values.name}
          onChange={(event) => (set("name", event.target.value), form.clear("name"))}
        />
      </FormField>
      <FormField label="Work email" error={form.fields.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={CONTROL}
          value={values.email}
          onChange={(event) => (set("email", event.target.value), form.clear("email"))}
        />
      </FormField>
      <FormField label="Password" error={form.fields.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          meter
          className={CONTROL}
          value={values.password}
          onChange={(event) => (set("password", event.target.value), form.clear("password"))}
        />
      </FormField>
      <FormField label="Business name" aside="Optional" error={form.fields.businessName} hint="Shown on your invoices. You can change it later.">
        <Input
          name="businessName"
          autoComplete="organization"
          className={CONTROL}
          value={values.businessName}
          onChange={(event) => (set("businessName", event.target.value), form.clear("businessName"))}
        />
      </FormField>

      <div>
        <label className="flex items-start gap-2.5 text-sm leading-snug">
          <input
            type="checkbox"
            name="terms"
            className={CHECK}
            checked={terms}
            aria-invalid={form.fields.terms ? true : undefined}
            aria-describedby={form.fields.terms ? "terms-error" : undefined}
            onChange={(event) => (setTerms(event.target.checked), form.clear("terms"))}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {form.fields.terms ? (
          <p id="terms-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {form.fields.terms}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="xl" className="w-full" loading={form.pending}>
        Create account
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const form = useAuthForm(forgotPasswordAction, forgotSchema, (data) => ({ email: data.get("email") }));
  const { values, set } = useValues({ email: "" });

  if (form.sent) {
    return (
      <div role="status" className="rounded-xl border bg-card p-5 shadow-raised">
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <h2 className="text-base font-semibold">Check your inbox</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          If an account exists, we&rsquo;ve sent a link. It works once and expires in 30 minutes.
        </p>
        <Button asChild variant="outline" size="xl" className="mt-5 w-full">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={form.formAction} onSubmit={form.onSubmit} noValidate className="space-y-4">
      <FormError message={form.error} />
      <FormField label="Email" error={form.fields.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          className={CONTROL}
          value={values.email}
          onChange={(event) => (set("email", event.target.value), form.clear("email"))}
        />
      </FormField>
      <Button type="submit" size="xl" className="w-full" loading={form.pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const form = useAuthForm(resetPasswordAction, resetSchema, (data) => ({ token: data.get("token"), password: data.get("password") }));
  const { values, set } = useValues({ password: "" });

  return (
    <form action={form.formAction} onSubmit={form.onSubmit} noValidate className="space-y-4">
      <FormError message={form.error} />
      <input type="hidden" name="token" value={token} />
      <FormField label="New password" error={form.fields.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          autoFocus
          meter
          className={CONTROL}
          value={values.password}
          onChange={(event) => (set("password", event.target.value), form.clear("password"))}
        />
      </FormField>
      <Button type="submit" size="xl" className="w-full" loading={form.pending}>
        Set new password
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">Setting a new password signs you out everywhere else.</p>
    </form>
  );
}
