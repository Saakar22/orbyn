"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GHOST_SIZES, ghostPill, PILL_SIZES, PillDisc, pillBase, solidPill, type PillSize } from "./pill";

/** Submit button for the demo form. Must be rendered inside <form action={startDemo}>. */
export function StartDemoButton({
  size = "hero",
  label = "Try the live demo",
  tone = "solid",
}: {
  size?: PillSize;
  label?: string;
  /** "ghost" is the quieter outline used beside a primary action on dark backgrounds. */
  tone?: "solid" | "ghost";
}) {
  const { pending } = useFormStatus();
  const text = pending ? "Preparing your workspace…" : label;

  if (tone === "ghost") {
    return (
      <button type="submit" disabled={pending} className={cn(pillBase, ghostPill, GHOST_SIZES[size], "gap-2")}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {text}
      </button>
    );
  }

  return (
    <button type="submit" disabled={pending} className={cn(pillBase, solidPill, PILL_SIZES[size])}>
      {text}
      <PillDisc size={size}>{pending ? <Loader2 className="size-4 animate-spin" /> : undefined}</PillDisc>
    </button>
  );
}
