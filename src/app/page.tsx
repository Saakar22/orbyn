import { BadgeCheck, MessageSquareText, ShieldCheck, Workflow } from "lucide-react";
import { startDemo } from "@/app/actions/auth";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";
import { StartDemoButton } from "@/components/landing/start-demo-button";

const STEPS = [
  { icon: MessageSquareText, title: "Intent", body: "Say what you need in plain language: invoice a client, chase a payment, check cash flow." },
  { icon: Workflow, title: "Plan", body: "Orbyn picks the right tools, extracts the details and prepares each step for review." },
  { icon: ShieldCheck, title: "Approve", body: "Anything that saves data or touches money waits for your explicit approval." },
  { icon: BadgeCheck, title: "Verified", body: "Payments run through PayPal. Invoices turn paid only after a verified capture." },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <OrbynWordmark />
        <span className="text-xs text-muted-foreground">PayPal AI Hackathon · Sandbox build</span>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16 md:px-8">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-ai" />
            AI financial operations agent, built on PayPal
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-[56px]">
            From financial intent to intelligent execution.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Orbyn turns instructions like &ldquo;invoice Alex $500 and send a PayPal checkout&rdquo; into real,
            verified workflows for freelancers and small businesses.
          </p>
          <form action={startDemo} className="mt-8 flex flex-wrap items-center gap-4">
            <StartDemoButton />
            <span className="text-xs text-muted-foreground">
              Creates a private workspace with labelled demo data. No sign-up.
            </span>
          </form>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="bg-card p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="tabular">0{i + 1}</span>
                <Icon className="size-3.5" />
              </div>
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
