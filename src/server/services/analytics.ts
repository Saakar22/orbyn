import "server-only";
import { z } from "zod";
import { balanceDue } from "@/lib/payments";
import { db } from "@/server/db";

const DAY_MS = 86_400_000;

export const summaryInput = z.object({
  period: z.enum(["this_month", "last_month", "last_30_days", "year_to_date"]).default("this_month"),
});
export type SummaryPeriod = z.infer<typeof summaryInput>["period"];

function periodRange(period: SummaryPeriod, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "this_month":
      return { start: new Date(y, m, 1), end: now, prevStart: new Date(y, m - 1, 1), prevEnd: new Date(y, m, 1), label: "This month" };
    case "last_month":
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), prevStart: new Date(y, m - 2, 1), prevEnd: new Date(y, m - 1, 1), label: "Last month" };
    case "last_30_days":
      return { start: new Date(now.getTime() - 30 * DAY_MS), end: now, prevStart: new Date(now.getTime() - 60 * DAY_MS), prevEnd: new Date(now.getTime() - 30 * DAY_MS), label: "Last 30 days" };
    case "year_to_date":
      return { start: new Date(y, 0, 1), end: now, prevStart: new Date(y - 1, 0, 1), prevEnd: new Date(y - 1, m, now.getDate()), label: "Year to date" };
  }
}

async function revenueBetween(userId: string, start: Date, end: Date) {
  const result = await db.transaction.aggregate({
    where: { userId, status: "COMPLETED", createdAt: { gte: start, lt: end } },
    _sum: { amountMinor: true, refundedMinor: true },
    _count: true,
  });
  // Revenue is net of refunds. Fully refunded payments have status REFUNDED and are excluded entirely.
  return { amountMinor: (result._sum.amountMinor ?? 0) - (result._sum.refundedMinor ?? 0), count: result._count };
}

/** Outstanding = issued, unpaid invoices. Overdue = the subset past due. */
export async function getOutstanding(userId: string) {
  const now = new Date();
  const rows = await db.invoice.findMany({
    where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
    select: {
      id: true,
      invoiceNumber: true,
      totalMinor: true,
      amountPaidMinor: true,
      currency: true,
      dueDate: true,
      client: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  // Outstanding money is the balance still due, so partial payments reduce it.
  const unpaid = rows.map((row) => ({ ...row, balanceMinor: balanceDue(row), isOverdue: row.dueDate < now }));
  const overdue = unpaid.filter((invoice) => invoice.isOverdue);
  const sum = (rows: typeof unpaid) => rows.reduce((total, row) => total + row.balanceMinor, 0);

  const byClient = new Map<string, number>();
  for (const invoice of unpaid) byClient.set(invoice.client.name, (byClient.get(invoice.client.name) ?? 0) + invoice.balanceMinor);

  return {
    outstandingMinor: sum(unpaid),
    outstandingCount: unpaid.length,
    overdueMinor: sum(overdue),
    overdueCount: overdue.length,
    topClients: [...byClient.entries()]
      .map(([client, amountMinor]) => ({ client, amountMinor }))
      .sort((a, b) => b.amountMinor - a.amountMinor)
      .slice(0, 5),
    unpaid,
  };
}

export async function getFinancialSummary(userId: string, raw: z.input<typeof summaryInput> = {}) {
  const { period } = summaryInput.parse(raw);
  const range = periodRange(period);
  const [current, previous, outstanding, paidInPeriod, issuedInPeriod] = await Promise.all([
    revenueBetween(userId, range.start, range.end),
    revenueBetween(userId, range.prevStart, range.prevEnd),
    getOutstanding(userId),
    db.invoice.count({ where: { userId, status: "PAID", paidAt: { gte: range.start, lt: range.end } } }),
    db.invoice.count({ where: { userId, status: { not: "DRAFT" }, issueDate: { gte: range.start, lt: range.end } } }),
  ]);

  const change = previous.amountMinor > 0 ? (current.amountMinor - previous.amountMinor) / previous.amountMinor : null;

  return {
    period,
    periodLabel: range.label,
    currency: "USD",
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    revenueMinor: current.amountMinor,
    paymentsCount: current.count,
    previousRevenueMinor: previous.amountMinor,
    revenueChangePct: change === null ? null : Math.round(change * 1000) / 10,
    invoicesPaid: paidInPeriod,
    invoicesIssued: issuedInPeriod,
    outstandingMinor: outstanding.outstandingMinor,
    outstandingCount: outstanding.outstandingCount,
    overdueMinor: outstanding.overdueMinor,
    overdueCount: outstanding.overdueCount,
    topUnpaidClients: outstanding.topClients,
  };
}

export async function getOverdueInvoices(userId: string) {
  const now = Date.now();
  const { unpaid } = await getOutstanding(userId);
  return unpaid
    .filter((invoice) => invoice.dueDate.getTime() < now)
    .map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      client: invoice.client.name,
      totalMinor: invoice.totalMinor,
      amountPaidMinor: invoice.amountPaidMinor,
      balanceMinor: invoice.balanceMinor,
      currency: invoice.currency,
      dueDate: invoice.dueDate.toISOString(),
      daysOverdue: Math.floor((now - invoice.dueDate.getTime()) / DAY_MS),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/** Completed revenue per calendar month, oldest first, for the dashboard chart. */
export async function getMonthlyRevenue(userId: string, months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const rows = await db.transaction.findMany({
    where: { userId, status: "COMPLETED", createdAt: { gte: start } },
    select: { amountMinor: true, refundedMinor: true, createdAt: true },
  });
  const buckets = Array.from({ length: months }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleString("en-US", { month: "short" }), revenueMinor: 0 };
  });
  for (const row of rows) {
    const bucket = buckets.find((b) => b.key === `${row.createdAt.getFullYear()}-${row.createdAt.getMonth()}`);
    if (bucket) bucket.revenueMinor += row.amountMinor - row.refundedMinor;
  }
  return buckets.map(({ month, revenueMinor }) => ({ month, revenueMinor }));
}

export const recentTransactionsInput = z.object({ limit: z.number().int().min(1).max(25).default(5) });

export async function getRecentTransactions(userId: string, raw: z.input<typeof recentTransactionsInput> = {}) {
  const { limit } = recentTransactionsInput.parse(raw);
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { invoice: { select: { invoiceNumber: true, client: { select: { name: true } } } } },
  });
  return rows.map((row) => ({
    id: row.id,
    amountMinor: row.amountMinor,
    refundedMinor: row.refundedMinor,
    currency: row.currency,
    status: row.status,
    source: row.source,
    captureId: row.captureId,
    paypalOrderId: row.paypalOrderId,
    invoiceNumber: row.invoice?.invoiceNumber ?? null,
    client: row.invoice?.client.name ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}
