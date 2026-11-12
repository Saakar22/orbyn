import { exportTransactions, transactionFiltersInput } from "@/server/services/analytics";
import { requireWorkspaceId, UnauthorizedError } from "@/server/session";

const SOURCES: Record<string, string> = { PAYPAL_SANDBOX: "PayPal Sandbox (verified)", SEEDED: "Demo (seeded)", USER: "Manual", AGENT: "Assistant" };

/** Quote a CSV cell, and neutralise values a spreadsheet would run as a formula. */
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const amount = (minor: number) => (minor / 100).toFixed(2);

export async function GET(request: Request) {
  let workspaceId: string;
  try {
    workspaceId = await requireWorkspaceId();
  } catch (error) {
    if (error instanceof UnauthorizedError) return new Response("Unauthorized", { status: 401 });
    throw error;
  }

  const url = new URL(request.url);
  const pick = (key: string) => url.searchParams.get(key)?.trim() || undefined;
  const parsed = transactionFiltersInput.safeParse({ source: pick("source"), from: pick("from"), to: pick("to"), query: pick("q") });
  if (!parsed.success) return new Response("Invalid filters", { status: 400 });

  const rows = await exportTransactions(workspaceId, parsed.data);
  const header = ["Date (UTC)", "Client", "Invoice", "Amount", "Refunded", "Currency", "Status", "Source", "PayPal capture id", "PayPal order id", "Payer email"];
  const lines = rows.map((row) =>
    [
      row.createdAt.toISOString(),
      row.invoice?.client.name,
      row.invoice?.invoiceNumber,
      amount(row.amountMinor),
      amount(row.refundedMinor),
      row.currency,
      row.status,
      SOURCES[row.source] ?? row.source,
      row.captureId,
      row.paypalOrderId,
      row.payerEmail,
    ]
      .map(cell)
      .join(","),
  );
  const body = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orbyn-transactions-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
