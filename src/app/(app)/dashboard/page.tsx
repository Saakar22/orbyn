import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2, MessageSquarePlus, Sparkles } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { SourceBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { daysUntil, describeDue, formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getFinancialSummary, getMonthlyRevenue, getOutstanding, getRecentTransactions } from "@/server/services/analytics";
import { listDueReminders } from "@/server/services/reminders";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "Dashboard" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

const QUICK_ACTIONS = [
  { group: "Create", prompt: "Create an invoice for Alex for $500 for website development" },
  { group: "Follow up", prompt: "Which clients have overdue payments? Suggest follow-ups." },
  { group: "Understand", prompt: "Summarize my financial activity this month" },
];

const DUE_SOON_DAYS = 7;

/** "Nov 1–12", or "Oct 30 – Nov 2" across months. */
function span(startIso: string, endIso: string) {
  const start = new Date(startIso);
  // The range end is exclusive; show the last day it includes.
  const end = new Date(new Date(endIso).getTime() - 1);
  const month = (d: Date) => formatDate(d, { month: "short" });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()}–${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

const reminderPrompt = (invoiceNumber: string) => `Draft a polite payment reminder for ${invoiceNumber}`;

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace();
  const [summary, monthly, outstanding, transactions, dueReminders] = await Promise.all([
    getFinancialSummary(workspace.id, { period: "this_month" }),
    getMonthlyRevenue(workspace.id, 6),
    getOutstanding(workspace.id),
    getRecentTransactions(workspace.id, { limit: 5 }),
    listDueReminders(workspace.id),
  ]);
  const currency = workspace.currency;
  const money = (minor: number) => formatMoney(minor, currency);
  const thisWindow = span(summary.range.start, summary.range.end);
  const lastWindow = span(summary.previousRange.start, summary.previousRange.end);
  const overdue = outstanding.unpaid.filter((invoice) => invoice.isOverdue);
  const dueSoon = outstanding.unpaid.filter((invoice) => !invoice.isOverdue && daysUntil(invoice.dueDate) <= DUE_SOON_DAYS);
  const later = outstanding.unpaid.length - overdue.length - dueSoon.length;

  return (
    <PageContainer>
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description={`${workspace.name} · figures for ${thisWindow}, in ${currency}.`}
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/assistant">
              <Sparkles className="size-3.5" /> Ask Orbyn
            </Link>
          </Button>
        }
      />

      {dueReminders.length ? (
        <section className="rounded-xl border border-warning/40 bg-warning-soft/50 px-4 py-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold">
            <BellRing className="size-4 text-warning" aria-hidden />
            {dueReminders.length} scheduled reminder{dueReminders.length === 1 ? " is" : "s are"} ready to send
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-[13px]">
            {dueReminders.map((reminder) => (
              <li key={reminder.id}>
                <Link href={`/invoices/${reminder.invoice.id}`} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 hover:bg-muted/60">
                  <span className="font-medium">{reminder.invoice.client.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{reminder.invoice.invoiceNumber}</span>
                  <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue, month to date"
          value={money(summary.revenueMinor)}
          delta={{ change: summary.revenueChangePct === null ? null : summary.revenueChangePct / 100, against: `${thisWindow} vs ${lastWindow}` }}
          note={`${summary.paymentsCount} payment${summary.paymentsCount === 1 ? "" : "s"}, net of refunds`}
        />
        <KpiCard
          label="Invoiced, month to date"
          value={money(summary.invoicedMinor)}
          note={`${summary.invoicesIssued} invoice${summary.invoicesIssued === 1 ? "" : "s"} issued ${thisWindow}`}
        />
        <KpiCard
          label="Outstanding"
          value={money(summary.outstandingMinor)}
          note={`${summary.outstandingCount} unpaid invoice${summary.outstandingCount === 1 ? "" : "s"}, as of today`}
        />
        <KpiCard
          label="Overdue"
          value={money(summary.overdueMinor)}
          tone={summary.overdueCount ? "danger" : "default"}
          note={summary.overdueCount ? `${summary.overdueCount} past their due date` : "Nothing is late"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col rounded-xl border bg-card shadow-raised">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-[13px] font-semibold">Revenue, last 6 months</h2>
            <span className="text-[11px] text-muted-foreground">* {formatDate(new Date(), { month: "short" })} is in progress · {currency}</span>
          </header>
          <div className="flex-1 px-2 pt-4 pb-2">
            <RevenueChart data={monthly} currency={currency} partialLabel={`to ${formatDate(new Date(), { month: "short", day: "numeric" })}`} />
          </div>
        </section>

        <section className="flex flex-col rounded-xl border bg-card shadow-raised" aria-labelledby="attention">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 id="attention" className="text-[13px] font-semibold">
              Needs attention
            </h2>
            <Link href="/invoices?status=UNPAID" className="text-[11px] text-muted-foreground hover:text-foreground">
              All unpaid
            </Link>
          </header>
          {overdue.length + dueSoon.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing needs you right now" className="flex-1 py-10">
              {later > 0 ? `${later} invoice${later === 1 ? " is" : "s are"} due later than a week from now.` : "Every issued invoice is paid."}
            </EmptyState>
          ) : (
            <div className="flex-1 divide-y">
              <AttentionGroup title="Overdue" tone="danger" invoices={overdue} currency={currency} />
              <AttentionGroup title={`Due in the next ${DUE_SOON_DAYS} days`} tone="warning" invoices={dueSoon} currency={currency} />
              {later > 0 ? (
                <p className="px-4 py-2.5 text-xs text-muted-foreground">
                  {later} more due later.{" "}
                  <Link href="/invoices?status=PENDING" className="font-medium text-primary hover:underline">
                    See them
                  </Link>
                </p>
              ) : null}
            </div>
          )}
          <p className="border-t px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            “Send reminder” opens the assistant with a draft. Nothing is sent until you approve it.
          </p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border bg-card shadow-raised">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-[13px] font-semibold">Recent transactions</h2>
            <Link href="/transactions" className="text-[11px] text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </header>
          {transactions.length === 0 ? (
            <EmptyState title="No payments yet">Payments appear here once a client pays through an invoice&rsquo;s PayPal link.</EmptyState>
          ) : (
            <ul className="divide-y text-[13px]">
              {transactions.map((txn) => (
                <li key={txn.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{txn.client ?? "Unknown payer"}</span>
                      <SourceBadge source={txn.source} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDate(txn.createdAt)}
                      {txn.invoiceNumber ? ` · ${txn.invoiceNumber}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={txn.status} className="hidden sm:inline-flex" />
                  <span className="tabular w-24 text-right font-medium">{formatMoney(txn.amountMinor, txn.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card shadow-raised">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="size-3.5 text-ai" aria-hidden />
            <h2 className="text-[13px] font-semibold">Ask Orbyn</h2>
          </header>
          <ul className="divide-y text-[13px]">
            {QUICK_ACTIONS.map(({ group, prompt }) => (
              <li key={prompt}>
                <Link href={`/assistant?q=${encodeURIComponent(prompt)}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-muted-foreground">{group}</span>
                    <span className="block text-foreground/90">{prompt}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  );
}

type Unpaid = Awaited<ReturnType<typeof getOutstanding>>["unpaid"][number];

function AttentionGroup({ title, tone, invoices, currency }: { title: string; tone: "danger" | "warning"; invoices: Unpaid[]; currency: string }) {
  if (!invoices.length) return null;
  const total = invoices.reduce((sum, invoice) => sum + invoice.balanceMinor, 0);
  return (
    <div>
      <h3 className={cn("flex items-center justify-between px-4 pt-3 pb-1 text-[11px] font-semibold", tone === "danger" ? "text-danger" : "text-[oklch(0.5_0.12_65)]")}>
        <span>
          {title} · {invoices.length}
        </span>
        <span className="tabular">{formatMoney(total, currency)}</span>
      </h3>
      <ul className="text-[13px]">
        {invoices.slice(0, 4).map((invoice) => (
          <li key={invoice.id} className="group flex items-center gap-3 px-4 py-2 hover:bg-muted/50">
            <Link href={`/invoices/${invoice.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{invoice.client.name}</span>
              <span className={cn("block text-[11px]", tone === "danger" ? "text-danger" : "text-muted-foreground")}>
                {invoice.invoiceNumber} · {describeDue(invoice.dueDate)}
              </span>
            </Link>
            <span className="flex flex-col items-end gap-0.5">
              <span className="tabular font-medium">{formatMoney(invoice.balanceMinor, invoice.currency)}</span>
              <Link
                href={`/assistant?draft=${encodeURIComponent(reminderPrompt(invoice.invoiceNumber))}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <MessageSquarePlus className="size-3" aria-hidden />
                Send reminder
              </Link>
            </span>
          </li>
        ))}
        {invoices.length > 4 ? (
          <li className="px-4 pb-2 text-[11px] text-muted-foreground">
            <Link href={tone === "danger" ? "/invoices?status=OVERDUE" : "/invoices?status=PENDING"} className="hover:text-foreground">
              +{invoices.length - 4} more
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
