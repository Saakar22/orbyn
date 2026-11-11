import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PILL_SIZES = {
  nav: "h-10 gap-2.5 pl-4 pr-1.5 text-[13px]",
  hero: "h-12 gap-3 pl-6 pr-2 text-[15px]",
  closing: "h-14 gap-3.5 pl-8 pr-2.5 text-base",
} as const;

export const GHOST_SIZES = {
  nav: "h-10 px-4 text-[13px]",
  hero: "h-12 px-6 text-[15px]",
  closing: "h-14 px-8 text-base",
} as const;

const DISCS = { nav: "size-7", hero: "size-8", closing: "size-9" } as const;

export type PillSize = keyof typeof PILL_SIZES;

export const pillBase =
  "group inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-80";

/** The primary call to action: a light pill that ends in an indigo disc. */
export const solidPill = "bg-[#fffdf9] text-[#17132f]";

/** The quieter second action, for use on the night scenes. */
export const ghostPill = "border border-white/35 bg-white/[0.06] text-[#fffdf9] hover:bg-white/[0.14]";

export function PillDisc({ size, children }: { size: PillSize; children?: ReactNode }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-[#4a3fd1] text-[#fffdf9] transition-transform duration-300 group-hover:translate-x-0.5",
        DISCS[size],
      )}
      aria-hidden
    >
      {children ?? <ArrowRight className="size-4" />}
    </span>
  );
}

export function PillLink({
  href,
  size = "hero",
  outlined = false,
  className,
  children,
}: {
  href: string;
  size?: PillSize;
  /** Adds a hairline so the pill holds its edge on light backgrounds. */
  outlined?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(pillBase, solidPill, PILL_SIZES[size], outlined && "ring-1 ring-[rgb(23_19_47/0.14)]", className)}>
      {children}
      <PillDisc size={size} />
    </Link>
  );
}
