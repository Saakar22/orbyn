"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  nav: "h-9 px-4 text-[13px]",
  hero: "h-12 px-6 text-[15px]",
  closing: "h-14 px-8 text-base",
} as const;

/** Submit button for the demo form. Must be rendered inside <form action={startDemo}>. */
export function StartDemoButton({ size = "hero", label = "Try the live demo" }: { size?: keyof typeof SIZES; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--indigo)] font-medium text-[#fffdf9]",
        "transition-[background-color,transform] duration-200 hover:bg-[var(--ink)] active:scale-[0.98] disabled:opacity-70",
        SIZES[size],
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? "Preparing your workspace…" : label}
    </button>
  );
}
