import Link from "next/link";
import { ArrowUpRight, FileText, FlaskConical, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTabs, Pagination, SearchBox } from "@/components/shared/list-controls";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { amountClass, SourceBadge, StatusBadge } from "@/components/shared/status-badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { describeDue, formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, displayStatus } from "@/lib/payments";
import { countInvoicesByTab, INVOICE_TABS, listInvoices, type InvoiceTab } from "@/server/services/invoices";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "Invoices" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

const PAGE_SIZE = 20;
const TAB_LABELS: Record<InvoiceTab, string> = {
  ALL: "All",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
  PENDING: "Pending",
  PAID: "Paid",
  DRAFT: "Draft",
  CANCELLED: "Cancelled",
};

type Row = Awaited<ReturnType<typeof listInvoices>>[number];

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const tab = INVOICE_TABS.find((value) => value === params.status) ?? "ALL";
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim().slice(0, 100) : undefined;
  const counts = await countInvoicesByTab(workspace.id, query);
  const total = counts[tab];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const invoices = await listInvoices(workspace.id, {
    status: tab === "ALL" ? undefined : tab,
    query,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const hasDemo = invoices.some((invoice) => invoice.source === "SEEDED");

  const columns: Column<Row>[] = [
    {
      key: "invoice",
      header: "Invoice",
      hideOnMobile: true,
      cell: (invoice) => (
        <Link href={`/invoices/${invoice.id}`} className="block after:absolute after:inset-0">
          <span className="flex items-center gap-2 font-medium">
            <span className="font-mono text-[12px]">{invoice.invoiceNumber}</span>
            <SourceBadge source={invoice.source} />
          </span>
          <span className="mt-0.5 block max-w-[220px] truncate text-xs text-muted-foreground">{invoice.description}</span>
        </Link>
      ),
    },
    {
      key: "client",
      header: "Client",
      hideOnMobile: true,
      cell: (invoice) => (
        <>
          <div className="font-medium">{invoice.client.name}</div>
          <div className="text-xs text-muted-foreground">{invoice.client.company}</div>
        </>
      ),
    },
    { key: "status", header: "Status", cell: (invoice) => <StatusBadge status={displayStatus(invoice)} /> },
    { key: "issued", header: "Issued", cell: (invoice) => <span className="text-muted-foreground">{formatDate(invoice.issueDate)}</span> },
    { key: "due", header: "Due", cell: (invoice) => <DueCell invoice={invoice} /> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (invoice) => (
        <span className="tabular font-medium">
          <span className={amountClass(invoice.status)}>{formatMoney(invoice.totalMinor, invoice.currency)}</span>
          {invoice.amountPaidMinor > 0 && invoice.amountPaidMinor < invoice.totalMinor ? (
            <span className="block text-xs font-normal text-muted-foreground">{formatMoney(balanceDue(invoice), invoice.currency)} due</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "open",
      header: "",
      hideOnMobile: true,
      className: "w-10",
      cell: () => (
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100" aria-hidden />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="Every invoice, its status and its PayPal payment trail."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/invoices/new">
              <Plus className="size-3.5" /> New invoice
            </Link>
          </Button>
        }
      />

      {hasDemo ? (
        <Banner tone="info">
          Rows marked <span className="font-semibold">Demo</span> are sample data. Payments marked PayPal Sandbox are real sandbox captures.
        </Banner>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          name="status"
          label="Filter invoices by status"
          options={INVOICE_TABS.map((value) => ({ value, label: TAB_LABELS[value], count: counts[value] }))}
        />
        <SearchBox label="Search invoices" placeholder="Search client, number, item" />
      </div>

      <DataTable
        caption="Invoices"
        columns={columns}
        rows={invoices}
        rowKey={(invoice) => invoice.id}
        rowClassName={() => "relative cursor-pointer"}
        mobileTitle={(invoice) => (
          <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-2 after:absolute after:inset-0">
            <span className="truncate">{invoice.client.name}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-[12px] text-muted-foreground">{invoice.invoiceNumber}</span>
              <SourceBadge source={invoice.source} />
            </span>
          </Link>
        )}
        empty={
          counts.ALL === 0 && !query ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              action={
                <>
                  <Button asChild size="sm">
                    <Link href="/invoices/new">New invoice</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/assistant?draft=${encodeURIComponent("Create an invoice for ")}`}>Ask the assistant</Link>
                  </Button>
                </>
              }
            >
              Create one yourself, or tell the assistant who to bill and for what.
            </EmptyState>
          ) : (
            <EmptyState icon={FlaskConical} title="Nothing matches">
              No invoices fit this filter{query ? ` and the search “${query}”` : ""}. Try another tab or clear the search.
            </EmptyState>
          )
        }
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="invoices" />}
      />
    </PageContainer>
  );
}

function DueCell({ invoice }: { invoice: Row }) {
  if (invoice.status === "PAID") {
    return <span className="text-success">{invoice.paidAt ? `Paid ${formatDate(invoice.paidAt, { month: "short", day: "numeric" })}` : "Paid"}</span>;
  }
  if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    return <span className="text-muted-foreground">{invoice.status === "DRAFT" ? "Not issued" : "—"}</span>;
  }
  return (
    <>
      <div>{formatDate(invoice.dueDate)}</div>
      <div className={invoice.status === "OVERDUE" ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{describeDue(invoice.dueDate)}</div>
    </>
  );
}
