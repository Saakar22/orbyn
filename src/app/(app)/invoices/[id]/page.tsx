import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cancelInvoiceAction } from "@/app/actions/invoices";
import { CopyLinkButton } from "@/components/invoices/copy-link-button";
import { RefundDialog } from "@/components/invoices/refund-dialog";
import { ReminderActions } from "@/components/reminders/reminder-actions";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PageContainer } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { dateInputFromToday, daysUntil, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, displayStatus, isPayableStatus, refundableMinor } from "@/lib/payments";
import { reminderDisplayStatus, reminderSubject, TONE_LABELS, type ReminderTone } from "@/lib/reminders";
import { getInvoice } from "@/server/services/invoices";
import { reminderTemplates } from "@/server/services/reminders";
import { requireWorkspace } from "@/server/session";

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function InvoiceDetailPage({ params }: PageProps<"/invoices/[id]">) {
  const { user, workspace } = await requireWorkspace();
  const { id } = await params;
  const invoice = await getInvoice(workspace.id, { id });
  if (!invoice) notFound();

  const payable = isPayableStatus(invoice.status) && balanceDue(invoice) > 0;
  const payPath = `/pay/${invoice.publicToken}`;
  const templates = payable ? await reminderTemplates(workspace.id, invoice.id) : null;

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
            issuer: { name: user.name, businessName: workspace.name, email: user.email },
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
                  {txn.refundedMinor > 0 && txn.status !== "REFUNDED" ? (
                    <div className="text-[11px] text-muted-foreground">{formatMoney(txn.refundedMinor, txn.currency)} refunded</div>
                  ) : null}
                  {refundableMinor(txn) > 0 ? (
                    <div className="mt-1 -ml-1.5">
                      <RefundDialog
                        transactionId={txn.id}
                        invoiceId={invoice.id}
                        currency={txn.currency}
                        refundableMinor={refundableMinor(txn)}
                        payerEmail={txn.payerEmail}
                        invoice={{
                          totalMinor: invoice.totalMinor,
                          amountPaidMinor: invoice.amountPaidMinor,
                          status: invoice.status,
                          invoiceNumber: invoice.invoiceNumber,
                        }}
                      />
                    </div>
                  ) : null}
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
              {invoice.reminders.map((reminder) => {
                const status = reminderDisplayStatus(reminder);
                return (
                  <li key={reminder.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{formatDateTime(reminder.sentAt ?? reminder.scheduledAt)}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">{TONE_LABELS[reminder.tone as ReminderTone] ?? reminder.tone}</div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{reminder.message}</p>
                    <ReminderActions
                      reminderId={reminder.id}
                      invoiceId={invoice.id}
                      status={status}
                      clientEmail={invoice.client.email}
                      subject={reminderSubject(invoice.invoiceNumber, reminder.tone)}
                      message={reminder.message}
                    />
                  </li>
                );
              })}
              {invoice.reminders.length === 0 ? <li className="text-muted-foreground">None scheduled.</li> : null}
            </ol>
            {templates ? (
              <div className="mt-4">
                <ReminderForm invoiceId={invoice.id} templates={templates} suggestedTone={suggestedTone(invoice.dueDate)} today={dateInputFromToday(0)} />
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

/** Escalate the default tone with how late the invoice is. */
function suggestedTone(dueDate: Date): ReminderTone {
  const late = -daysUntil(dueDate);
  if (late > 14) return "final";
  if (late > 0) return "firm";
  return "polite";
}
