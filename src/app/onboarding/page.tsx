import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { paypalStatus } from "@/server/paypal/status";
import { requireWorkspace } from "@/server/session";

export const metadata: Metadata = { title: "Set up your workspace" };

// Reads the signed-in session, so navigation waits for the server by design.
export const instant = false;

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-8 flex items-center justify-between">
          <OrbynWordmark />
          <form action={signOutAction}>
            <button type="submit" className="rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sign out
            </button>
          </form>
        </header>
        <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}

async function Content() {
  const { user, workspace } = await requireWorkspace({ allowOnboarding: true });
  if (user.onboardedAt) redirect("/dashboard");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-title font-semibold tracking-tight">Welcome, {user.name.split(" ")[0]}. Let&rsquo;s set up your workspace.</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Three short steps. It takes about a minute.</p>
      </div>
      <OnboardingWizard
        defaults={{ businessName: workspace.name, currency: workspace.currency, timezone: workspace.timezone }}
        paypal={paypalStatus()}
      />
    </>
  );
}
