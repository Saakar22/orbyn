import type { Metadata } from "next";
import Link from "next/link";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";

export const metadata: Metadata = { title: "Privacy Policy" };

// PLACEHOLDER COPY: written for the hackathon sandbox build. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-sm leading-relaxed sm:py-16">
      <Link href="/" aria-label="Orbyn home" className="inline-block">
        <OrbynWordmark />
      </Link>
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">What Orbyn stores and why. This is a short placeholder for the sandbox build.</p>
      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-base font-semibold">What we store</h2>
          <p className="mt-1.5 text-muted-foreground">Your name, email and a one-way hash of your password, plus the clients, invoices and conversations you create.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">How it is used</h2>
          <p className="mt-1.5 text-muted-foreground">Only to run your workspace. Requests you type to the assistant are sent to the AI model provider to produce a reply.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Payments</h2>
          <p className="mt-1.5 text-muted-foreground">Payments are handled by PayPal (sandbox). Orbyn never sees card details.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold">Deleting your data</h2>
          <p className="mt-1.5 text-muted-foreground">Deleting your account in Settings removes your workspace and its records.</p>
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
