import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { googleEnabled } from "@/auth";
import { SignupForm } from "@/components/auth/forms";
import { AuthHeading, DemoInstead, Divider, GoogleButton } from "@/components/auth/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthContext } from "@/server/session";

export const metadata: Metadata = { title: "Create your account" };

// Reads the session, so navigation waits for the server by design.
export const instant = false;

export default function SignupPage() {
  return (
    <>
      <AuthHeading title="Create your account">Free while Orbyn runs on the PayPal sandbox. No card needed.</AuthHeading>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <SignupContent />
      </Suspense>
    </>
  );
}

async function SignupContent() {
  const context = await getAuthContext();
  if (context && !context.user.isGuest) redirect("/dashboard");
  const fromDemo = Boolean(context?.user.isGuest);

  return (
    <div className="space-y-4">
      {googleEnabled && !fromDemo ? (
        <>
          <GoogleButton label="Sign up with Google" />
          <Divider>or with email</Divider>
        </>
      ) : null}
      <SignupForm fromDemo={fromDemo} />
      {fromDemo ? null : <DemoInstead label="Just looking? Try the live demo" />}
      <p className="pt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
