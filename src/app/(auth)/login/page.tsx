import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { googleEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/forms";
import { AuthHeading, DemoInstead, Divider, GoogleButton } from "@/components/auth/parts";
import { Banner } from "@/components/ui/banner";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/auth-schemas";
import { getAuthContext } from "@/server/session";

export const metadata: Metadata = { title: "Log in" };

// Reads the session and the query string, so navigation waits for the server by design.
export const instant = false;

const NOTICES: Record<string, { tone: "success" | "danger" | "info"; text: string }> = {
  reset: { tone: "success", text: "Your password was changed. Log in with the new one." },
  created: { tone: "success", text: "Your account is ready. Log in to continue." },
  demo: { tone: "danger", text: "The demo couldn't be started. Please try again." },
  "demo-limit": { tone: "danger", text: "Too many demo workspaces were started from here. Try again in an hour." },
  google: { tone: "danger", text: "Google sign-in didn't complete. Try again, or use your email and password." },
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading title="Welcome back">Log in to pick up where you left off.</AuthHeading>
      <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;

  // Already signed in to a real account: nothing to do here. Demo guests may still log in to their own account.
  const context = await getAuthContext();
  if (context && !context.user.isGuest) redirect(next ?? "/dashboard");

  const notice =
    (params.reset && NOTICES.reset) ||
    (params.created && NOTICES.created) ||
    (typeof params.error === "string" ? (NOTICES[params.error] ?? NOTICES.google) : undefined) ||
    (next ? { tone: "info" as const, text: "Log in to continue to that page." } : undefined);

  return (
    <div className="space-y-4">
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      {googleEnabled ? (
        <>
          <GoogleButton next={next} label="Continue with Google" />
          <Divider>or with email</Divider>
        </>
      ) : null}
      <LoginForm next={next} />
      <DemoInstead />
      <p className="pt-2 text-center text-sm text-muted-foreground">
        New to Orbyn?{" "}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
