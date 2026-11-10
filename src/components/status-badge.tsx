import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string; dot: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  PENDING: { label: "Pending", className: "bg-warning-soft text-[oklch(0.5_0.12_65)]", dot: "bg-warning" },
  OVERDUE: { label: "Overdue", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  PAID: { label: "Paid", className: "bg-success-soft text-success", dot: "bg-success" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through", dot: "bg-muted-foreground/40" },
  COMPLETED: { label: "Completed", className: "bg-success-soft text-success", dot: "bg-success" },
  DENIED: { label: "Denied", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  REFUNDED: { label: "Refunded", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  CREATED: { label: "Awaiting payer", className: "bg-accent text-accent-foreground", dot: "bg-primary" },
  APPROVED: { label: "Approved by payer", className: "bg-accent text-accent-foreground", dot: "bg-ai" },
  SCHEDULED: { label: "Scheduled", className: "bg-accent text-accent-foreground", dot: "bg-primary" },
  DUE: { label: "Due", className: "bg-warning-soft text-[oklch(0.5_0.12_65)]", dot: "bg-warning" },
  SENT: { label: "Sent", className: "bg-success-soft text-success", dot: "bg-success" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        style.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

/** Marks seeded demo records so they are never mistaken for real sandbox activity. */
export function SourceBadge({ source }: { source: string }) {
  if (source === "SEEDED") {
    return (
      <span className="rounded border border-dashed px-1 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Demo
      </span>
    );
  }
  if (source === "PAYPAL_SANDBOX") {
    return (
      <span className="rounded bg-[oklch(0.95_0.03_250)] px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-[oklch(0.42_0.12_255)]">
        PayPal Sandbox
      </span>
    );
  }
  if (source === "AGENT") {
    return (
      <span className="rounded bg-ai-soft px-1 py-px text-[10px] font-medium uppercase tracking-wide text-ai">Orbyn</span>
    );
  }
  return null;
}
