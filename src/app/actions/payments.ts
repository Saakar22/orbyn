"use server";

// createPayPalOrderAction / capturePayPalOrderAction are public (pay page; access is by the invoice's
// public token). refundPaymentAction requires the signed-in owner.

import { revalidatePath } from "next/cache";
import { toMinor } from "@/lib/money";
import { completePayment, PaymentError, startPayment, type PaymentOutcome } from "@/server/services/payments";
import { RefundError, refundPayment, type RefundOutcome } from "@/server/services/refunds";
import { requireWorkspaceId } from "@/server/session";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function failure(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof PaymentError) return { ok: false, error: error.message };
  console.error("[payments]", error);
  return { ok: false, error: fallback };
}

export async function createPayPalOrderAction(publicToken: string, amount: string): Promise<Result<string>> {
  let amountMinor: number;
  try {
    amountMinor = toMinor(String(amount));
  } catch {
    return { ok: false, error: "Enter a valid amount, like 250 or 250.50." };
  }
  try {
    return { ok: true, value: await startPayment(String(publicToken), amountMinor) };
  } catch (error) {
    return failure(error, "Could not start the PayPal payment. Please try again.");
  }
}

export async function capturePayPalOrderAction(publicToken: string, paypalOrderId: string): Promise<Result<PaymentOutcome>> {
  try {
    const outcome = await completePayment(String(publicToken), String(paypalOrderId));
    revalidatePath(`/pay/${publicToken}`);
    return { ok: true, value: outcome };
  } catch (error) {
    return failure(error, "PayPal could not complete the payment. You have not been charged twice — please refresh to check.");
  }
}

/** Owner-only: refund part or all of a PayPal payment. */
export async function refundPaymentAction(
  transactionId: string,
  invoiceId: string | null,
  amount: string,
  reason: string,
): Promise<Result<RefundOutcome>> {
  const workspaceId = await requireWorkspaceId();
  let amountMinor: number;
  try {
    amountMinor = toMinor(String(amount));
  } catch {
    return { ok: false, error: "Enter a valid amount, like 250 or 250.50." };
  }
  try {
    const outcome = await refundPayment(workspaceId, String(transactionId), amountMinor, String(reason).trim() || undefined);
    if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
    for (const path of ["/invoices", "/transactions", "/dashboard"]) revalidatePath(path);
    return { ok: true, value: outcome };
  } catch (error) {
    if (error instanceof RefundError) return { ok: false, error: error.message };
    console.error("[refunds]", error);
    return { ok: false, error: "The refund could not be completed. Nothing was refunded twice; refresh to check its status." };
  }
}
