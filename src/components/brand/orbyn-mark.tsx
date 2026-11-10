import { cn } from "@/lib/utils";

/** Orbyn mark: a core with an orbit and a single satellite. */
export function OrbynMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-6", className)}>
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-[oklch(0.34_0.13_274)]" />
      <ellipse cx="16" cy="16" rx="10.5" ry="5.5" transform="rotate(-28 16 16)" stroke="white" strokeOpacity="0.45" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="4.2" fill="white" />
      <circle cx="24.6" cy="10.4" r="2" fill="oklch(0.78 0.14 292)" />
    </svg>
  );
}

export function OrbynWordmark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <OrbynMark />
      <span className={cn("text-[15px] font-semibold tracking-[0.18em]", inverted ? "text-white" : "text-foreground")}>
        ORBYN
      </span>
    </span>
  );
}
