"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { googleEnabled, signIn, signOut } from "@/auth";
import { fieldErrors, forgotSchema, loginSchema, resetSchema, safeNextPath, signupSchema } from "@/lib/auth-schemas";
import { AccountError, createPasswordReset, registerAccount, resetPassword } from "@/server/auth/accounts";
import { clientAddress, LIMITS, rateLimit, waitMessage } from "@/server/auth/rate-limit";
import { getAuthContext } from "@/server/session";

export type AuthFormState =
  | { error?: string; fields?: Record<string, string>; sent?: boolean }
  | undefined;

const isRateLimited = (error: AuthError) => (error as { code?: string }).code === "rate_limited";

/** One click: a guest session with its own seeded workspace, so demo visitors never collide. */
export async function startDemo() {
  if (await getAuthContext()) redirect("/dashboard");
  try {
    await signIn("demo", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login?error=${isRateLimited(error) ? "demo-limit" : "demo"}`);
    throw error; // the redirect on success
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/?notice=signed-out" });
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: String(formData.get("businessName") ?? "").trim() || undefined,
    terms: formData.get("terms") === "on",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const limit = await rateLimit(`signup:${await clientAddress()}`, LIMITS.signupPerAddress.limit, LIMITS.signupPerAddress.windowSeconds);
  if (!limit.ok) return { error: waitMessage(limit.retryAfterSeconds) };

  // Someone exploring the demo can bring that workspace with them. Only a guest's own workspace qualifies.
  const context = await getAuthContext();
  const keepGuestId = formData.get("demo") === "keep" && context?.user.isGuest ? context.user.id : undefined;

  let keptDemo: boolean;
  try {
    ({ keptDemo } = await registerAccount(parsed.data, { keepGuestId }));
  } catch (error) {
    if (error instanceof AccountError && error.code === "email_taken") return { fields: { email: error.message } };
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      remember: "true",
      redirectTo: keptDemo ? "/dashboard" : "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?created=1");
    throw error;
  }
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      remember: String(parsed.data.remember),
      redirectTo: safeNextPath(formData.get("next")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (isRateLimited(error)) return { error: waitMessage(LIMITS.loginPerAccount.windowSeconds) };
      // Deliberately the same message for an unknown email and a wrong password.
      return { error: "Email or password is incorrect." };
    }
    throw error;
  }
}

export async function googleSignInAction(formData: FormData) {
  if (!googleEnabled) redirect("/login");
  await signIn("google", { redirectTo: safeNextPath(formData.get("next")) });
}

export async function forgotPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const address = await clientAddress();
  const [perAccount, perAddress] = await Promise.all([
    rateLimit(`reset:${parsed.data.email}`, LIMITS.resetPerAccount.limit, LIMITS.resetPerAccount.windowSeconds),
    rateLimit(`reset:${address}`, LIMITS.resetPerAddress.limit, LIMITS.resetPerAddress.windowSeconds),
  ]);
  if (!perAddress.ok) return { error: waitMessage(perAddress.retryAfterSeconds) };

  // Past the per-account limit we stay quiet and send nothing, so the response never reveals whether the account exists.
  if (perAccount.ok) {
    const reset = await createPasswordReset(parsed.data.email, process.env.APP_URL || "http://localhost:3000");
    if (reset) deliverResetLink(reset.email, reset.link);
  }
  return { sent: true };
}

/** No email provider is configured, so in development the link is printed where the developer can copy it. */
function deliverResetLink(email: string, link: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[auth] Password reset link for ${email} (valid 30 minutes, single use):\n${link}\n`);
  } else {
    console.warn("[auth] A password reset was requested, but no email provider is configured, so nothing was sent.");
  }
}

export async function resetPasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return fields.token ? { error: "This reset link is not valid. Request a new one." } : { fields };
  }
  const limit = await rateLimit(`reset-use:${await clientAddress()}`, LIMITS.resetPerAddress.limit, LIMITS.resetPerAddress.windowSeconds);
  if (!limit.ok) return { error: waitMessage(limit.retryAfterSeconds) };

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof AccountError) return { error: error.message };
    throw error;
  }
  redirect("/login?reset=1");
}
