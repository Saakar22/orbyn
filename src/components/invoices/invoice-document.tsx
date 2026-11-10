import { OrbynMark } from "@/components/brand/orbyn-mark";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export type InvoiceDocumentData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: Date | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
  description?: string | null;
  subtotalMinor: number;
  taxRateBps: number;
  taxMinor: number;
  totalMinor: number;
  issuer: { name: string; businessName?: string | null; email?: string | null };
  client: { name: string; company?: string | null; email?: string | null };
  items: { description: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
};

/** A clean, print-like invoice. Shared by the app and the client-facing pay page. */
export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const money = (minor: number) => formatMoney(minor, invoice.currency);

  return (
    <article className="rounded-lg border bg-card p-6 text-[13px] shadow-[0_1px_2px_oklch(0.2_0.03_272/0.04)] md:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <OrbynMark className="size-9" />
          <div>
            <div className="text-sm font-semibold">{invoice.issuer.businessName ?? invoice.issuer.name}</div>
            <div className="text-xs text-muted-foreground">{invoice.issuer.email}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Invoice</div>
          <div className="mt-1 font-mono text-base font-semibold">{invoice.invoiceNumber}</div>
          <div className="mt-2 flex justify-end">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Billed to</div>
          <div className="mt-1.5 font-medium">{invoice.client.name}</div>
          {invoice.client.company ? <div className="text-muted-foreground">{invoice.client.company}</div> : null}
          {invoice.client.email ? <div className="text-muted-foreground">{invoice.client.email}</div> : null}
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Issued</div>
          <div className="mt-1.5">{formatDate(invoice.issueDate)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {invoice.paidAt ? "Paid" : "Due"}
          </div>
          <div className="mt-1.5">{formatDate(invoice.paidAt ?? invoice.dueDate)}</div>
        </div>
      </div>

      <table className="mt-10 w-full">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">Unit price</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="py-3 pr-4">{item.description}</td>
              <td className="tabular py-3 text-right">{item.quantity}</td>
              <td className="tabular hidden py-3 text-right sm:table-cell">{money(item.unitPriceMinor)}</td>
              <td className="tabular py-3 text-right">{money(item.totalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-6 ml-auto max-w-xs space-y-2">
        <div className="flex justify-between text-muted-foreground">
          <dt>Subtotal</dt>
          <dd className="tabular">{money(invoice.subtotalMinor)}</dd>
        </div>
        {invoice.taxMinor > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <dt>Tax ({invoice.taxRateBps / 100}%)</dt>
            <dd className="tabular">{money(invoice.taxMinor)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular">{money(invoice.totalMinor)}</dd>
        </div>
      </dl>
    </article>
  );
}
