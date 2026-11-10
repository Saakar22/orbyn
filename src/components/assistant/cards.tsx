"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ExternalLink, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { describeDue, formatDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

// Every number in these cards comes straight from a tool result, never from model text.

export function CardShell({ title, meta, children, className }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card text-[13px]", className)}>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">{title}</div>
        {meta ? <div className="text-[11px] text-muted-foreground">{meta}</div> : null}
      </div>
      {children}
    </div>
  );
}

export type DraftInvoiceOutput = {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  isNewClient: boolean;
  client: { name: string; email: string | null; company: string | null };
  description: string | null;
  items: { description: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  dueDate: string;
};

export function InvoicePreviewCard({ draft, status, footer }: { draft: DraftInvoiceOutput; status?: string; footer?: ReactNode }) {
  const money = (minor: number) => formatMoney(minor, draft.currency);
  return (
    <CardShell
      title={
        <>
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="font-mono">{draft.invoiceNumber}</span>
          <StatusBadge status={status ?? draft.status} />
        </>
      }
      meta={`Due ${formatDate(draft.dueDate)}`}
    >
      <div className="grid gap-4 p-3.5 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Bill to</div>
          <div className="mt-0.5 font-medium">
            {draft.client.name}
            {draft.isNewClient ? (
              <span className="ml-1.5 rounded bg-ai-soft px-1 py-px text-[10px] font-medium text-ai">New client</span>
            ) : null}
          </div>
          {draft.client.company ? <div className="text-muted-foreground">{draft.client.company}</div> : null}
        </div>
        <div className="sm:text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</div>
          <div className="tabular text-lg font-semibold">{money(draft.totalMinor)}</div>
        </div>
      </div>
      <table className="w-full border-t">
        <tbody>
          {draft.items.map((item, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-3.5 py-2">{item.description}</td>
              <td className="tabular px-3.5 py-2 text-right text-muted-foreground">
                {item.quantity} × {money(item.unitPriceMinor)}
              </td>
              <td className="tabular px-3.5 py-2 text-right font-medium">{money(item.totalMinor)}</td>
            </tr>
          ))}
          {draft.taxMinor > 0 ? (
            <tr className="border-t">
              <td className="px-3.5 py-2 text-muted-foreground" colSpan={2}>
                Tax
              </td>
              <td className="tabular px-3.5 py-2 text-right">{money(draft.taxMinor)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {footer}
    </CardShell>
  );
}

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  client: string;
  status?: string;
  totalMinor: number;
  currency: string;
  dueDate: string;
  daysOverdue?: number;
  source?: string;
};

export function InvoiceListCard({ title, invoices, totalMinor }: { title: string; invoices: InvoiceListItem[]; totalMinor: number }) {
  return (
    <CardShell title={title} meta={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · ${formatMoney(totalMinor)}`}>
      {invoices.length === 0 ? (
        <div className="px-3.5 py-6 text-center text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y">
          {invoices.slice(0, 10).map((invoice) => (
            <li key={invoice.id}>
              <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-3 px-3.5 py-2 hover:bg-muted/50">
                <span className="w-[68px] shrink-0 font-mono text-[11px] text-muted-foreground">{invoice.invoiceNumber}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{invoice.client}</span>
                <span
                  className={cn(
                    "hidden text-xs sm:inline",
                    invoice.daysOverdue !== undefined || invoice.status === "OVERDUE" ? "text-danger" : "text-muted-foreground",
                  )}
                >
                  {invoice.status === "PAID" ? "Paid" : describeDue(invoice.dueDate)}
                </span>
                {invoice.status ? <StatusBadge status={invoice.status} /> : null}
                <span className="tabular w-24 text-right font-medium">{formatMoney(invoice.totalMinor, invoice.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

type Summary = {
  periodLabel: string;
  revenueMinor: number;
  paymentsCount: number;
  previousRevenueMinor: number;
  revenueChangePct: number | null;
  outstandingMinor: number;
  outstandingCount: number;
  overdueMinor: number;
  overdueCount: number;
  topUnpaidClients: { client: string; amountMinor: number }[];
};

export function SummaryCard({ summary }: { summary: Summary }) {
  const up = (summary.revenueChangePct ?? 0) >= 0;
  return (
    <CardShell title="Financial summary" meta={summary.periodLabel}>
      <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 sm:divide-y-0">
        <Metric label="Revenue" value={formatMoney(summary.revenueMinor)}>
          {summary.revenueChangePct !== null ? (
            <span className={cn("inline-flex items-center gap-0.5", up ? "text-success" : "text-danger")}>
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(summary.revenueChangePct)}% vs prior
            </span>
          ) : (
            `${summary.paymentsCount} payments`
          )}
        </Metric>
        <Metric label="Outstanding" value={formatMoney(summary.outstandingMinor)}>
          {summary.outstandingCount} unpaid invoices
        </Metric>
        <Metric label="Overdue" value={formatMoney(summary.overdueMinor)} danger={summary.overdueCount > 0}>
          {summary.overdueCount} past due
        </Metric>
      </div>
      {summary.topUnpaidClients.length ? (
        <div className="border-t px-3.5 py-2.5">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Largest unpaid balances</div>
          <ul className="space-y-1">
            {summary.topUnpaidClients.slice(0, 3).map((row) => (
              <li key={row.client} className="flex justify-between">
                <span>{row.client}</span>
                <span className="tabular font-medium">{formatMoney(row.amountMinor)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CardShell>
  );
}

function Metric({ label, value, children, danger }: { label: string; value: string; children?: ReactNode; danger?: boolean }) {
  return (
    <div className="px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-0.5 text-base font-semibold", danger && "text-danger")}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{children}</div>
    </div>
  );
}

type Txn = {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  source: string;
  captureId: string | null;
  invoiceNumber: string | null;
  client: string | null;
  createdAt: string;
};

export function TransactionsCard({ transactions }: { transactions: Txn[] }) {
  return (
    <CardShell title="Recent transactions" meta={`${transactions.length} shown`}>
      <ul className="divide-y">
        {transactions.map((txn) => (
          <li key={txn.id} className="flex items-center gap-3 px-3.5 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="truncate">{txn.client ?? "Unknown payer"}</span>
                <SourceBadge source={txn.source} />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {formatDateTime(txn.createdAt)}
                {txn.invoiceNumber ? ` · ${txn.invoiceNumber}` : ""}
                {txn.captureId ? <span className="font-mono"> · {txn.captureId}</span> : null}
              </div>
            </div>
            <StatusBadge status={txn.status} />
            <span className="tabular w-24 text-right font-medium">{formatMoney(txn.amountMinor, txn.currency)}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

export function InvoiceDetailCard({ invoice }: { invoice: InvoiceListItem & { description: string | null; payPath?: string } }) {
  return (
    <CardShell
      title={
        <>
          <span className="font-mono">{invoice.invoiceNumber}</span>
          {invoice.status ? <StatusBadge status={invoice.status} /> : null}
        </>
      }
      meta={invoice.client}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <div className="min-w-0">
          <div className="truncate">{invoice.description}</div>
          <div className="text-[11px] text-muted-foreground">Due {formatDate(invoice.dueDate)}</div>
        </div>
        <div className="tabular text-base font-semibold">{formatMoney(invoice.totalMinor, invoice.currency)}</div>
      </div>
      <div className="flex gap-3 border-t px-3.5 py-2 text-xs">
        <Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
          Open invoice
        </Link>
        {invoice.payPath && (invoice.status === "PENDING" || invoice.status === "OVERDUE") ? (
          <Link href={invoice.payPath} target="_blank" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Checkout page <ExternalLink className="size-3" />
          </Link>
        ) : null}
      </div>
    </CardShell>
  );
}
