"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  nav: "h-10 gap-2.5 pl-4 pr-1.5 text-[13px] ring-1 ring-[var(--line)]",
  hero: "h-12 gap-3 pl-6 pr-2 text-[15px]",
  closing: "h-14 gap-3.5 pl-8 pr-2.5 text-base",
} as const;

const DISCS = { nav: "size-7", hero: "size-8", closing: "size-9" } as const;

/** Submit button for the demo form. Must be rendered inside <form action={startDemo}>. */
export function StartDemoButton({ size = "hero", label = "Try the live demo" }: { size?: keyof typeof SIZES; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group inline-flex shrink-0 items-center justify-center rounded-full bg-[#fffdf9] font-medium text-[var(--ink)]",
        "transition-transform duration-200 active:scale-[0.98] disabled:opacity-80",
        SIZES[size],
      )}
    >
      {pending ? "Preparing your workspace…" : label}
      <span
        className={cn(
          "grid place-items-center rounded-full bg-[var(--indigo)] text-[#fffdf9] transition-transform duration-300 group-hover:translate-x-0.5",
          DISCS[size],
        )}
        aria-hidden
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
      </span>
    </button>
  );
}
