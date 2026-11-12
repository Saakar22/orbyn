import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PayPanel } from "@/components/pay/pay-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, displayStatus, isPayableStatus, MIN_PAYMENT_MINOR } from "@/lib/payments";
import { paypalConfigured } from "@/server/paypal/client";
import { getInvoiceForPayer } from "@/server/services/payments";

export const metadata: Metadata = { title: "Pay invoice", robots: { index: false, follow: false } };

export default function PayPage({ params }: PageProps<"/pay/[token]">) {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <Suspense fallback={<PaySkeleton />}>
          <PayContent params={params} />
        </Suspense>
        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> Payments are processed by PayPal (sandbox). Orbyn never sees your card details.
        </p>
      </div>
    </div>
  );
}

async function PayContent({ params }: { params: PageProps<"/pay/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const invoice = await getInvoiceForPayer(token);
  if (!invoice) notFound();

  const balanceMinor = balanceDue(invoice);
  const money = (minor: number) => formatMoney(minor, invoice.currency);
  const payable = isPayableStatus(invoice.status) && balanceMinor > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <InvoiceDocument invoice={{ ...invoice, status: displayStatus(invoice), issuer: { name: invoice.workspace.owner.name, businessName: invoice.workspace.name, email: invoice.workspace.owner.email } }} />

      <aside className="rounded-lg border bg-card p-5 lg:sticky lg:top-8">
        {payable ? (
          <>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance due</div>
            <div className="tabular mt-1 text-3xl font-semibold tracking-tight">{money(balanceMinor)}</div>
            <div className={invoice.status === "OVERDUE" ? "mt-1 text-xs text-danger" : "mt-1 text-xs text-muted-foreground"}>
              {invoice.status === "OVERDUE" ? "Overdue since " : "Due "}
              {formatDate(invoice.dueDate)}
              {invoice.amountPaidMinor > 0 ? ` · ${money(invoice.amountPaidMinor)} of ${money(invoice.totalMinor)} paid` : null}
            </div>
            <div className="mt-5">
              {paypalConfigured() && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                <PayPanel
                  token={token}
                  clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}
                  currency={invoice.currency}
                  balanceMinor={balanceMinor}
                  minMinor={Math.min(MIN_PAYMENT_MINOR, balanceMinor)}
                />
              ) : (
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Online payment isn&apos;t set up for this invoice yet.</p>
              )}
            </div>
          </>
        ) : invoice.status === "PAID" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 className="size-9 text-success" />
            <div className="mt-3 font-semibold">Paid in full</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {money(invoice.totalMinor)}
              {invoice.paidAt ? ` · ${formatDate(invoice.paidAt)}` : null}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">This invoice is no longer open for payment.</div>
        )}
      </aside>
    </div>
  );
}

function PaySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Skeleton className="h-[520px]" />
      <Skeleton className="h-64" />
    </div>
  );
}
