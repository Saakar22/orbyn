import Link from "next/link";
import { AlertTriangle, ArrowDownRight, BellRing, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PageContainer, PageHeader } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { describeDue, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getFinancialSummary, getMonthlyRevenue, getOutstanding, getRecentTransactions } from "@/server/services/analytics";
import { listDueReminders } from "@/server/services/reminders";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "Dashboard" };

const QUICK_ACTIONS = [
  "Create an invoice for Alex for $500 for website development",
  "Which clients have overdue payments?",
  "Summarize my financial activity this month",
];

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace();
  const [summary, monthly, outstanding, transactions, dueReminders] = await Promise.all([
    getFinancialSummary(workspace.id, { period: "this_month" }),
    getMonthlyRevenue(workspace.id, 6),
    getOutstanding(workspace.id),
    getRecentTransactions(workspace.id, { limit: 6 }),
    listDueReminders(workspace.id),
  ]);
  const up = (summary.revenueChangePct ?? 0) >= 0;

  return (
    <PageContainer>
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description="Here's where your money stands today."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/assistant">
              <Sparkles className="size-3.5" /> Ask Orbyn
            </Link>
          </Button>
        }
      />

      {dueReminders.length ? (
        <section className="rounded-lg border border-warning/40 bg-warning-soft/40 px-4 py-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold">
            <BellRing className="size-4 text-warning" />
            {dueReminders.length} reminder{dueReminders.length === 1 ? "" : "s"} ready to send
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-[13px]">
            {dueReminders.map((reminder) => (
              <li key={reminder.id}>
                <Link
                  href={`/invoices/${reminder.invoice.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 hover:bg-muted/60"
                >
                  <span className="font-medium">{reminder.invoice.client.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{reminder.invoice.invoiceNumber}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        <Kpi label="Revenue this month" value={formatMoney(summary.revenueMinor)}>
          {summary.revenueChangePct !== null ? (
            <span className={cn("inline-flex items-center gap-0.5", up ? "text-success" : "text-danger")}>
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(summary.revenueChangePct)}% vs last month
            </span>
          ) : (
            "No revenue last month to compare"
          )}
        </Kpi>
        <Kpi label="Outstanding" value={formatMoney(summary.outstandingMinor)}>
          {summary.outstandingCount} unpaid invoice{summary.outstandingCount === 1 ? "" : "s"}
        </Kpi>
        <Kpi label="Overdue" value={formatMoney(summary.overdueMinor)} tone={summary.overdueCount ? "danger" : undefined}>
          {summary.overdueCount} past due
        </Kpi>
        <Kpi label="Paid this month" value={String(summary.invoicesPaid)}>
          {summary.paymentsCount} payment{summary.paymentsCount === 1 ? "" : "s"} received
        </Kpi>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-[13px] font-semibold">Revenue, last 6 months</h2>
            <span className="text-[11px] text-muted-foreground">Completed payments · USD</span>
          </header>
          <div className="px-2 pt-4 pb-2">
            <RevenueChart data={monthly} />
          </div>
        </section>

        <section className="flex flex-col rounded-lg border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-[13px] font-semibold">Needs attention</h2>
            <Link href="/invoices?status=UNPAID" className="text-[11px] text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </header>
          {summary.overdueCount > 0 ? (
            <div className="flex items-start gap-2 border-b bg-danger-soft/50 px-4 py-2.5 text-xs">
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-danger" />
              <span>
                {summary.overdueCount} invoice{summary.overdueCount === 1 ? " is" : "s are"} overdue, totalling{" "}
                <strong className="tabular">{formatMoney(summary.overdueMinor)}</strong>.{" "}
                <Link
                  href={`/assistant?q=${encodeURIComponent("Which clients have overdue payments? Suggest follow-ups.")}`}
                  className="font-medium text-primary hover:underline"
                >
                  Plan follow-ups
                </Link>
              </span>
            </div>
          ) : null}
          <ul className="flex-1 divide-y text-[13px]">
            {outstanding.unpaid.slice(0, 6).map((invoice) => {
              const overdue = invoice.isOverdue;
              return (
                <li key={invoice.id}>
                  <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{invoice.client.name}</div>
                      <div className={cn("text-[11px]", overdue ? "text-danger" : "text-muted-foreground")}>
                        {invoice.invoiceNumber} · {describeDue(invoice.dueDate)}
                      </div>
                    </div>
                    <span className="tabular font-medium">{formatMoney(invoice.balanceMinor, invoice.currency)}</span>
                  </Link>
                </li>
              );
            })}
            {outstanding.unpaid.length === 0 ? (
              <li className="px-4 py-10 text-center text-muted-foreground">Everything is paid. Nice.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-[13px] font-semibold">Recent transactions</h2>
            <Link href="/transactions" className="text-[11px] text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </header>
          <ul className="divide-y text-[13px]">
            {transactions.map((txn) => (
              <li key={txn.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="truncate">{txn.client ?? "Unknown payer"}</span>
                    <SourceBadge source={txn.source} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(txn.createdAt)}
                    {txn.invoiceNumber ? ` · ${txn.invoiceNumber}` : ""}
                  </div>
                </div>
                <StatusBadge status={txn.status} />
                <span className="tabular w-24 text-right font-medium">{formatMoney(txn.amountMinor, txn.currency)}</span>
              </li>
            ))}
            {transactions.length === 0 ? (
              <li className="px-4 py-10 text-center text-muted-foreground">No transactions yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-lg border bg-card">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="size-3.5 text-ai" />
            <h2 className="text-[13px] font-semibold">Quick actions</h2>
          </header>
          <ul className="divide-y text-[13px]">
            {QUICK_ACTIONS.map((prompt) => (
              <li key={prompt}>
                <Link
                  href={`/assistant?q=${encodeURIComponent(prompt)}`}
                  className="group flex items-center gap-2 px-4 py-2.5 text-foreground/90 hover:bg-muted/50"
                >
                  <span className="flex-1">{prompt}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  );
}

function Kpi({ label, value, children, tone }: { label: string; value: string; children: ReactNode; tone?: "danger" }) {
  return (
    <div className="bg-card px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-1.5 text-2xl font-semibold tracking-tight", tone === "danger" && "text-danger")}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{children}</div>
    </div>
  );
}
