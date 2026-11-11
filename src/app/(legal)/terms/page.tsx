import type { Metadata } from "next";
import Link from "next/link";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";

export const metadata: Metadata = { title: "Terms" };

// PLACEHOLDER COPY: written for the hackathon sandbox build. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-sm leading-relaxed sm:py-16">
      <Link href="/" aria-label="Orbyn home" className="inline-block">
        <OrbynWordmark />
      </Link>
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Terms</h1>
      <p className="mt-2 text-muted-foreground">Orbyn is a hackathon build that runs on the PayPal sandbox. These terms are a short placeholder.</p>
      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-base font-semibold">Sandbox only</h2>
          <p className="mt-1.5 text-muted-foreground">Orbyn connects to PayPal&rsquo;s sandbox. No real money moves, and invoices created here are not legal tax documents.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Your account</h2>
          <p className="mt-1.5 text-muted-foreground">Keep your password to yourself. You are responsible for what happens in your workspace.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Your data</h2>
          <p className="mt-1.5 text-muted-foreground">You can delete your account and everything in it at any time from Settings.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">No warranty</h2>
          <p className="mt-1.5 text-muted-foreground">The service is provided as is, without any guarantee of availability.</p>
        </section>
      </div>
      <p className="mt-10">
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign up
        </Link>
      </p>
    </main>
  );
}
