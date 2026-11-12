import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown when a list has nothing in it. Says what belongs here and offers the next step. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {children ? <p className="mt-1 max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">{children}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
