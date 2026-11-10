import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cancelInvoiceAction } from "@/app/actions/invoices";
import { CopyLinkButton } from "@/components/invoices/copy-link-button";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PageContainer } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, displayStatus, isPayableStatus } from "@/lib/payments";
import { getInvoice } from "@/server/services/invoices";
import { requireUser } from "@/server/session";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoices/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoice(user.id, { id });
  if (!invoice) notFound();

  const payable = isPayableStatus(invoice.status) && balanceDue(invoice) > 0;
  const payPath = `/pay/${invoice.publicToken}`;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {payable ? (
            <>
              <CopyLinkButton path={payPath} />
              <Button asChild size="sm" className="gap-1.5">
                <Link href={payPath} target="_blank">
                  Open checkout <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </>
          ) : null}
          {payable || invoice.status === "DRAFT" ? (
            <form action={cancelInvoiceAction.bind(null, invoice.id)}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Cancel invoice
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <InvoiceDocument
          invoice={{
            ...invoice,
            status: displayStatus(invoice),
            issuer: { name: user.name, businessName: user.businessName, email: user.email },
          }}
        />

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment trail <SourceBadge source={invoice.source} />
            </h2>
            <ol className="mt-3 space-y-3 text-[13px]">
              {invoice.orders.map((order) => (
                <li key={order.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span>PayPal order</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">{order.paypalOrderId}</div>
                </li>
              ))}
              {invoice.transactions.map((txn) => (
                <li key={txn.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular font-medium">{formatMoney(txn.amountMinor, txn.currency)}</span>
                    <StatusBadge status={txn.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(txn.createdAt)}
                    {txn.captureId ? <span className="font-mono"> · {txn.captureId}</span> : null}
                  </div>
                </li>
              ))}
              {invoice.orders.length === 0 && invoice.transactions.length === 0 ? (
                <li className="text-muted-foreground">No payment activity yet.</li>
              ) : null}
            </ol>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reminders</h2>
            <ol className="mt-3 space-y-3 text-[13px]">
              {invoice.reminders.map((reminder) => (
                <li key={reminder.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{formatDateTime(reminder.scheduledAt)}</span>
                    <StatusBadge status={reminder.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{reminder.message}</p>
                </li>
              ))}
              {invoice.reminders.length === 0 ? <li className="text-muted-foreground">None scheduled.</li> : null}
            </ol>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
