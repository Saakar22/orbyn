import { PageContainer, PageHeader } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getRecentTransactions } from "@/server/services/analytics";
import { requireUser } from "@/server/session";

export const metadata = { title: "Transactions" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function TransactionsPage() {
  const user = await requireUser();
  const transactions = await getRecentTransactions(user.id, { limit: 25 });

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="Payments received. Rows marked PayPal Sandbox are verified sandbox captures; Demo rows are seeded history."
      />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Invoice</th>
              <th className="px-4 py-2.5 font-medium">PayPal reference</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(txn.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-medium">
                    {txn.client ?? "Unknown payer"} <SourceBadge source={txn.source} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{txn.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  {txn.captureId ? (
                    <>
                      <div>Capture {txn.captureId}</div>
                      <div>Order {txn.paypalOrderId}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={txn.status} />
                </td>
                <td className="tabular px-4 py-3 text-right font-medium">
                  {formatMoney(txn.amountMinor, txn.currency)} <span className="text-[11px] text-muted-foreground">{txn.currency}</span>
                  {txn.refundedMinor > 0 && txn.status !== "REFUNDED" ? (
                    <div className="text-[11px] font-normal text-muted-foreground">{formatMoney(txn.refundedMinor, txn.currency)} refunded</div>
                  ) : null}
                </td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
