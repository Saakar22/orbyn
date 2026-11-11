// Choices offered in onboarding and Settings, shared with the server-side validation.
import { z } from "zod";

/** Two-decimal currencies the PayPal sandbox accepts. */
export const CURRENCIES = [
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "AUD", label: "Australian dollar" },
  { code: "SGD", label: "Singapore dollar" },
] as const;

export const ROLES = ["Freelancer", "Founder or owner", "Finance or operations", "Agency or studio", "Something else"] as const;

const currencyCodes = CURRENCIES.map((currency) => currency.code) as [string, ...string[]];

export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(80, "That business name is too long."),
  currency: z.enum(currencyCodes, "Pick a currency."),
  timezone: z.string().refine(isTimeZone, "Pick a time zone."),
});

export const onboardingSchema = businessSchema.extend({
  role: z.enum(ROLES, "Pick the role closest to yours."),
  startWith: z.enum(["sample", "empty"]),
});
