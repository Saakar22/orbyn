import Link from "next/link";
import { ArrowLeftRight, Download } from "lucide-react";
import { CopyText } from "@/components/shared/copy-text";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTabs, Pagination, SearchBox } from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { SourceBadge, StatusBadge } from "@/components/shared/status-badge";
import { DateRange } from "@/components/transactions/date-range";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { listTransactions, transactionFiltersInput } from "@/server/services/analytics";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "Transactions" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

const PAGE_SIZE = 25;
type Row = Awaited<ReturnType<typeof listTransactions>>["rows"][number];

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const parsed = transactionFiltersInput.safeParse({ source: text(params.source), from: text(params.from), to: text(params.to), query: text(params.q) });
  const filters = parsed.success ? parsed.data : transactionFiltersInput.parse({});
  const requested = Math.max(1, Number(params.page) || 1);
  const result = await listTransactions(workspace.id, filters, { take: PAGE_SIZE, skip: (requested - 1) * PAGE_SIZE });
  const page = Math.min(requested, Math.max(1, Math.ceil(result.count / PAGE_SIZE)));
  const currency = workspace.currency;
  const showReference = result.rows.some((row) => row.captureId || row.paypalOrderId);

  const exportQuery = new URLSearchParams(
    Object.entries({ source: text(params.source), from: text(params.from), to: text(params.to), q: text(params.q) }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.createdAt)}
          <span className="block text-[11px]">{formatDate(row.createdAt, { hour: "numeric", minute: "2-digit" })}</span>
        </span>
      ),
    },
    {
      key: "client",
      header: "Client",
      hideOnMobile: true,
      cell: (row) => (
        <span className="flex items-center gap-1.5 font-medium">
          {row.invoice?.client.name ?? row.payerEmail ?? "Unknown payer"} <SourceBadge source={row.source} />
        </span>
      ),
    },
    {
      key: "invoice",
      header: "Invoice",
      cell: (row) =>
        row.invoice ? (
          <Link href={`/invoices/${row.invoice.id}`} className="font-mono text-[12px] underline-offset-4 hover:underline">
            {row.invoice.invoiceNumber}
          </Link>
        ) : (
          "—"
        ),
    },
    ...(showReference
      ? [
          {
            key: "reference",
            header: "PayPal reference",
            cell: (row: Row) =>
              row.captureId ? (
                <CopyText value={row.captureId} label="capture id" />
              ) : (
                <span className="text-[12px] text-muted-foreground">{row.source === "SEEDED" ? "Seeded" : "—"}</span>
              ),
          },
        ]
      : []),
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="tabular font-medium">
          {formatMoney(row.amountMinor, row.currency)}
          {row.refundedMinor > 0 && row.status !== "REFUNDED" ? (
            <span className="block text-[11px] font-normal text-muted-foreground">{formatMoney(row.refundedMinor, row.currency)} refunded</span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="Payments received. PayPal Sandbox rows are verified captures; Demo rows are seeded history."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={`/api/transactions/export${exportQuery ? `?${exportQuery}` : ""}`} download>
              <Download className="size-3.5" aria-hidden /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterTabs
          name="source"
          label="Filter by where the payment came from"
          options={[
            { value: "all", label: "All" },
            { value: "verified", label: "Verified by PayPal" },
            { value: "demo", label: "Demo" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DateRange />
          <SearchBox label="Search transactions" placeholder="Client, invoice or PayPal id" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-4 py-3 shadow-raised">
          <dt className="text-xs text-muted-foreground">Net received</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold">{formatMoney(result.netMinor, currency)}</dd>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 shadow-raised">
          <dt className="text-xs text-muted-foreground">Transactions</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold">{result.count}</dd>
        </div>
        <div className="col-span-2 rounded-xl border bg-card px-4 py-3 shadow-raised sm:col-span-1">
          <dt className="text-xs text-muted-foreground">Refunded</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold">{formatMoney(result.refundedMinor, currency)}</dd>
        </div>
      </dl>

      <DataTable
        caption="Transactions"
        columns={columns}
        rows={result.rows}
        rowKey={(row) => row.id}
        mobileTitle={(row) => (
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">{row.invoice?.client.name ?? row.payerEmail ?? "Unknown payer"}</span>
            <SourceBadge source={row.source} />
          </span>
        )}
        empty={
          <EmptyState icon={ArrowLeftRight} title={result.count === 0 && !exportQuery ? "No payments yet" : "Nothing matches"}>
            {exportQuery
              ? "No transactions fit these filters. Widen the dates or clear the search."
              : "When a client pays an invoice through its PayPal link, the verified capture appears here."}
          </EmptyState>
        }
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={result.count} noun="transactions" />}
      />
    </PageContainer>
  );
}
