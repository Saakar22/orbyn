import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiDelta = {
  /** Fractional change, e.g. 0.12 for +12%. null when there is nothing to compare against. */
  change: number | null;
  /** What the change is measured against, e.g. "vs Oct 1–11". */
  against: string;
  /** Set when a rise is bad news (overdue amounts). */
  invert?: boolean;
};

/** One headline figure with its label, an optional comparison and a line of context. */
export function KpiCard({
  label,
  value,
  delta,
  note,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  note?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-raised", className)}>
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-1.5 text-2xl font-semibold tracking-tight", tone === "danger" && "text-danger")}>{value}</div>
      {delta ? <Delta {...delta} /> : null}
      {note ? <div className="mt-1.5 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}

function Delta({ change, against, invert }: KpiDelta) {
  if (change === null) {
    return <div className="mt-1.5 text-xs text-muted-foreground">Nothing to compare yet ({against})</div>;
  }
  const flat = Math.abs(change) < 0.005;
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const percent = Math.abs(change * 100).toFixed(Math.abs(change) < 0.1 ? 1 : 0);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", flat ? "text-muted-foreground" : good ? "text-success" : "text-danger")}>
        <Icon className="size-3.5" aria-hidden />
        {flat ? "No change" : `${change > 0 ? "+" : "−"}${percent}%`}
      </span>
      <span className="text-muted-foreground">{against}</span>
    </div>
  );
}
