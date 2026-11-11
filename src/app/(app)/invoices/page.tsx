import Link from "next/link";
import { Plus } from "lucide-react";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { PageContainer, PageHeader } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { describeDue, formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, displayStatus } from "@/lib/payments";
import { listInvoices, listInvoicesInput } from "@/server/services/invoices";
import { requireUser } from "@/server/session";

export const metadata = { title: "Invoices" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = listInvoicesInput.safeParse({
    status: typeof params.status === "string" && params.status ? params.status : undefined,
    query: typeof params.q === "string" && params.q ? params.q : undefined,
  });
  const invoices = await listInvoices(user.id, filters.success ? filters.data : {});

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
      <InvoiceFilters />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Invoice</th>
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Issued</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="group border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-2 font-medium">
                    <span className="font-mono text-[12px]">{invoice.invoiceNumber}</span>
                    <SourceBadge source={invoice.source} />
                  </Link>
                  <div className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">{invoice.description}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{invoice.client.name}</div>
                  <div className="text-xs text-muted-foreground">{invoice.client.company}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={displayStatus(invoice)} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.issueDate)}</td>
                <td className="px-4 py-3">
                  <div>{formatDate(invoice.dueDate)}</div>
                  {invoice.status === "PENDING" || invoice.status === "OVERDUE" ? (
                    <div className={invoice.status === "OVERDUE" ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
                      {describeDue(invoice.dueDate)}
                    </div>
                  ) : null}
                </td>
                <td className="tabular px-4 py-3 text-right font-medium">
                  {formatMoney(invoice.totalMinor, invoice.currency)}
                  {invoice.amountPaidMinor > 0 && invoice.amountPaidMinor < invoice.totalMinor ? (
                    <div className="text-xs font-normal text-muted-foreground">
                      {formatMoney(balanceDue(invoice), invoice.currency)} due
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  No invoices match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
