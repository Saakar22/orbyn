// Validation shared by the auth forms (in the browser) and the server actions behind them.
import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-strength";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address, like name@company.com."));

export const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Include at least one letter and one number.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  email,
  password: newPassword,
  businessName: z.string().trim().max(80, "That business name is too long.").optional(),
  terms: z.literal(true, "Accept the terms to create an account."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX),
  remember: z.boolean().default(false),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: newPassword,
});

export const changePasswordSchema = z.object({
  current: z.string().max(PASSWORD_MAX),
  password: newPassword,
});

export type SignupInput = z.infer<typeof signupSchema>;

/** First message per field, in the shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNextPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n")) return fallback;
  return value;
}
