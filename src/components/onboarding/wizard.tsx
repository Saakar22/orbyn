"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, FileStack, Info, Sparkles } from "lucide-react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CURRENCIES, ROLES } from "@/lib/workspace-options";

const CONTROL = "h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]";
const STEPS = ["Business profile", "Starting data", "Payments"] as const;
const FALLBACK_ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];

const STARTS = [
  {
    value: "sample",
    icon: FileStack,
    title: "Start with sample data",
    body: "Seven clients and six months of invoices and payments, so the dashboard has something to show. Every sample record carries a Demo label, and you can clear it all later in Settings.",
  },
  {
    value: "empty",
    icon: Sparkles,
    title: "Start empty",
    body: "A clean workspace. Create your first invoice yourself, or ask the assistant to draft it.",
  },
] as const;

export type PayPalStatus = { connected: boolean; sandbox: boolean };

export function OnboardingWizard({ defaults, paypal }: { defaults: { businessName: string; currency: string; timezone: string }; paypal: PayPalStatus }) {
  const [state, formAction, pending] = useActionState(completeOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(defaults.businessName);
  const [nameError, setNameError] = useState<string>();
  const [role, setRole] = useState<string>(ROLES[0]);
  const [currency, setCurrency] = useState(defaults.currency);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [zones, setZones] = useState(FALLBACK_ZONES);
  const [startWith, setStartWith] = useState<"sample" | "empty">("sample");
  const heading = useRef<HTMLHeadingElement>(null);

  // The browser knows the person's time zone and the full list; the server only knows a default.
  useEffect(() => {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with browser-only information
    setZones(["UTC", ...supported.filter((zone) => zone !== "UTC")]);
    if (defaults.timezone === "UTC" && local) setTimezone(local);
  }, [defaults.timezone]);

  // If the server rejects an answer from step one, bring the person back to it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a server response
    if (state?.fields && Object.keys(state.fields).some((key) => key !== "startWith")) setStep(0);
  }, [state]);

  function go(next: number) {
    if (step === 0 && next > 0 && businessName.trim().length < 2) {
      setNameError("Enter your business name.");
      return;
    }
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // Enter inside a text field should move on, not submit half-way through.
        if (step < STEPS.length - 1) {
          event.preventDefault();
          go(step + 1);
        }
      }}
      className="rounded-2xl border bg-card shadow-overlay"
    >
      <div className="border-b px-5 py-4 sm:px-8">
        <ol className="flex items-center gap-2" aria-label="Setup progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={index === step ? "step" : undefined}>
              <span className={cn("h-1 rounded-full transition-colors duration-300", index <= step ? "bg-primary" : "bg-border")} />
              <span className={cn("text-xs", index === step ? "font-semibold text-foreground" : "text-muted-foreground")}>
                <span className="tabular">{index + 1}.</span> {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {state?.error ? (
          <Banner tone="danger" className="mb-5">
            {state.error}
          </Banner>
        ) : null}

        {/* Every step stays mounted so the final submit carries all the answers. */}
        <section hidden={step !== 0} aria-labelledby="step-heading-0">
          <StepHeading id="step-heading-0" refTo={step === 0 ? heading : undefined} title="Tell us about your business">
            This goes on your invoices and sets how amounts and dates are shown.
          </StepHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Business name" error={nameError ?? state?.fields?.businessName} className="sm:col-span-2">
              <Input
                name="businessName"
                autoComplete="organization"
                className={CONTROL}
                value={businessName}
                onChange={(event) => (setBusinessName(event.target.value), setNameError(undefined))}
              />
            </FormField>
            <FormField label="Your role" error={state?.fields?.role} className="sm:col-span-2">
              <NativeSelect name="role" className={CONTROL} value={role} onChange={(event) => setRole(event.target.value)}>
                {ROLES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Currency" error={state?.fields?.currency} hint="Used for new invoices.">
              <NativeSelect name="currency" className={CONTROL} value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} · {option.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Time zone" error={state?.fields?.timezone} hint="Detected from this device.">
              <NativeSelect name="timezone" className={CONTROL} value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {(zones.includes(timezone) ? zones : [timezone, ...zones]).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </section>

        <section hidden={step !== 1} aria-labelledby="step-heading-1">
          <StepHeading id="step-heading-1" refTo={step === 1 ? heading : undefined} title="How would you like to start?">
            You can switch later: sample data can be cleared, or loaded again, from Settings.
          </StepHeading>
          <div role="radiogroup" aria-label="Starting data" className="grid gap-3">
            {STARTS.map(({ value, icon: Icon, title, body }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3.5 rounded-xl border p-4 transition-colors",
                  startWith === value ? "border-primary bg-accent/60 ring-2 ring-ring/25" : "hover:border-foreground/25",
                )}
              >
                <input type="radio" name="startWith" value={value} checked={startWith === value} onChange={() => setStartWith(value)} className="sr-only" />
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", startWith === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {title}
                    {value === "sample" ? (
                      <span className="rounded border border-dashed px-1 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Demo</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{body}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section hidden={step !== 2} aria-labelledby="step-heading-2">
          <StepHeading id="step-heading-2" refTo={step === 2 ? heading : undefined} title="Payments run on the PayPal sandbox">
            Your clients pay through a PayPal test checkout. No real money moves, and you never enter PayPal credentials here.
          </StepHeading>
          <div className="rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <span className="text-sm font-medium">PayPal connection</span>
              <span className="inline-flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", paypal.connected ? "text-success" : "text-muted-foreground")}>
                  {paypal.connected ? <CheckCircle2 className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                  {paypal.connected ? (paypal.sandbox ? "Connected to the sandbox" : "Connected") : "Not connected yet"}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="How the PayPal connection works" className="rounded-full text-muted-foreground hover:text-foreground">
                      <Info className="size-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64 text-left leading-relaxed">
                    The connection is set once on the server by whoever runs this Orbyn instance. Credentials are never typed into the app or stored in your workspace.
                  </TooltipContent>
                </Tooltip>
              </span>
            </div>
            <ul className="space-y-2.5 px-4 py-4 text-[13px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                Each invoice gets a private pay link you can share with a client.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                An invoice is marked paid only after PayPal confirms the capture, never on a client&rsquo;s say-so.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                The assistant can draft invoices and reminders, and nothing is issued or sent until you approve it.
              </li>
            </ul>
          </div>
          {paypal.connected ? null : (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              You can still create invoices and try the assistant. Pay links will start working once the sandbox keys are added on the server.
            </p>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-8">
        <Button type="button" variant="ghost" size="lg" onClick={() => go(step - 1)} className={cn("gap-1.5", step === 0 && "invisible")}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
        {/* Distinct keys: otherwise React reuses one DOM button and flips its type mid-click, submitting early. */}
        {step < STEPS.length - 1 ? (
          <Button key="continue" type="button" size="xl" onClick={() => go(step + 1)}>
            Continue
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button key="finish" type="submit" size="xl" loading={pending}>
            Open my dashboard
          </Button>
        )}
      </div>
    </form>
  );
}

function StepHeading({ id, title, children, refTo }: { id: string; title: string; children: React.ReactNode; refTo?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="mb-6">
      <h2 id={id} ref={refTo} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
