"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeftRight, FileText, Search, Sparkles, X, type LucideIcon } from "lucide-react";
import { dismissTour } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STOPS: { icon: LucideIcon; title: string; body: string; href: string; link: string }[] = [
  {
    icon: Sparkles,
    title: "Ask in plain words",
    body: "Tell the assistant what you need, like “Invoice Alex $500 for website development”. It prepares a plan and waits for you.",
    href: "/assistant",
    link: "Open the assistant",
  },
  {
    icon: FileText,
    title: "You approve, then it happens",
    body: "Drafts stay drafts until you press Approve. Each invoice gets a private pay link to share with your client.",
    href: "/invoices",
    link: "See invoices",
  },
  {
    icon: ArrowLeftRight,
    title: "Paid means verified",
    body: "An invoice turns paid only after PayPal confirms the capture. Every payment and its PayPal reference is listed under Transactions.",
    href: "/transactions",
    link: "See transactions",
  },
  {
    icon: Search,
    title: "Jump anywhere",
    body: "Press Ctrl K (or ⌘ K on a Mac) to search pages and actions from wherever you are.",
    href: "/dashboard",
    link: "Back to the dashboard",
  },
];

/** A short tour shown once per person, the first time they reach the app. Closing it at any point ends it for good. */
export function WelcomeTour({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();
  if (!open) return null;

  const stop = STOPS[index];
  const last = index === STOPS.length - 1;
  const close = () => {
    setOpen(false);
    startTransition(() => dismissTour());
  };

  return (
    <aside
      aria-label="Welcome tour"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-sm animate-in rounded-2xl border bg-card p-4 shadow-modal duration-300 fade-in-0 slide-in-from-bottom-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai">
          <stop.icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {index === 0 ? `Welcome, ${firstName}` : "Getting started"} · {index + 1} of {STOPS.length}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">{stop.title}</h2>
        </div>
        <button type="button" onClick={close} aria-label="Close the tour" className="-mt-1 -mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        {stop.body}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {STOPS.map((_, dot) => (
            <span key={dot} className={cn("h-1.5 rounded-full transition-all duration-300", dot === index ? "w-5 bg-primary" : "w-1.5 bg-border")} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={stop.href} onClick={last ? close : undefined}>
              {stop.link}
            </Link>
          </Button>
          <Button size="sm" onClick={last ? close : () => setIndex(index + 1)}>
            {last ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
