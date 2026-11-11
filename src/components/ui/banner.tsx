import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { className: "border-[oklch(0.88_0.04_280)] bg-accent text-accent-foreground", icon: Info },
  warning: { className: "border-[oklch(0.88_0.07_80)] bg-warning-soft text-[oklch(0.4_0.1_65)]", icon: AlertTriangle },
  danger: { className: "border-[oklch(0.88_0.06_25)] bg-danger-soft text-danger", icon: AlertTriangle },
  success: { className: "border-[oklch(0.88_0.06_158)] bg-success-soft text-[oklch(0.4_0.1_158)]", icon: CheckCircle2 },
} satisfies Record<string, { className: string; icon: LucideIcon }>;

/** An inline message that stays on the page. For transient feedback use a toast. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { className: toneClass, icon: Icon } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-[13px]", toneClass, className)}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 leading-snug">
        {title ? <span className="font-semibold">{title} </span> : null}
        {children}
      </div>
      {action}
    </div>
  );
}
