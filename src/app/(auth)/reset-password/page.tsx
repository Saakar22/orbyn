import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth/forms";
import { AuthHeading } from "@/components/auth/parts";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isResetTokenValid } from "@/server/auth/accounts";

// The token is a secret in the URL: keep it out of search engines and referrer headers.
export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export const instant = false;

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <AuthHeading title="Set a new password">Choose a password you don&rsquo;t use anywhere else.</AuthHeading>
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <ResetContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetContent({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length >= 20 && (await isResetTokenValid(token));

  if (!valid) {
    return (
      <div className="space-y-4">
        <Banner tone="danger">This reset link has expired or was already used.</Banner>
        <Button asChild size="xl" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }
  return <ResetForm token={token} />;
}
