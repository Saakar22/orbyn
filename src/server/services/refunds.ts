import "server-only";
import { Prisma, type RefundStatus } from "@/generated/prisma/client";
import { fromPayPalValue, toPayPalValue } from "@/lib/money";
import { checkRefundAmount, invoiceAfterRefund, refundableMinor } from "@/lib/payments";
import { PayPalError, refundCapture, type PayPalRefund } from "@/server/paypal/client";
import { db } from "@/server/db";
import { audit, type Actor } from "@/server/services/audit";

/** An error whose message is safe to show to the invoice owner. */
export class RefundError extends Error {}

const REFUND_STATUS: Record<PayPalRefund["status"], RefundStatus> = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  CANCELLED: "FAILED",
  FAILED: "FAILED",
};

export type RefundOutcome = { state: "refunded" | "pending" | "failed"; amountMinor: number; currency: string; invoiceReopened: boolean };

/** Owner-initiated refund of part or all of a PayPal payment. */
export async function refundPayment(userId: string, transactionId: string, amountMinor: number, reason?: string): Promise<RefundOutcome> {
  const txn = await db.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { refunds: { where: { status: "PENDING" } } },
  });
  if (!txn) throw new RefundError("Payment not found.");
  if (!txn.captureId) throw new RefundError("Only PayPal payments can be refunded. This one is demo data.");

  // Refunds PayPal is still processing are spoken for, even though they are not counted yet.
  const pendingMinor = txn.refunds.reduce((sum, refund) => sum + refund.amountMinor, 0);
  const available = Math.max(0, refundableMinor(txn) - pendingMinor);
  const check = checkRefundAmount(amountMinor, available);
  if (!check.ok) throw new RefundError(check.reason);

  let refund: PayPalRefund;
  try {
    refund = await refundCapture(txn.captureId, {
      // Deterministic: a double click or retry from the same state returns the same PayPal refund.
      requestId: `refund-${txn.id}-${txn.refundedMinor + pendingMinor}-${amountMinor}`,
      currency: txn.currency,
      value: toPayPalValue(amountMinor),
      note: reason,
    });
  } catch (error) {
    if (error instanceof PayPalError) {
      console.error("[refunds] PayPal refused refund", txn.captureId, error.status, error.issue, error.debugId);
      if (error.status === 404) throw new RefundError("PayPal can't find this payment, so it can't be refunded.");
      if (error.status === 422 || error.status === 400) {
        throw new RefundError(`PayPal declined the refund${error.issue ? ` (${error.issue.toLowerCase().replaceAll("_", " ")})` : ""}.`);
      }
    }
    throw error;
  }

  const outcome = await recordRefund(refund, { captureId: txn.captureId, fallbackAmountMinor: amountMinor, reason, actor: "user" });
  if (!outcome) throw new Error(`Refund ${refund.id} could not be recorded`);
  return outcome;
}

/**
 * Record a PayPal refund exactly once (paypalRefundId is unique) and, the first time it is seen as
 * COMPLETED, take it off the payment and the invoice. Returns null if the capture isn't ours.
 */
export async function recordRefund(
  refund: PayPalRefund,
  ctx: { captureId: string; fallbackAmountMinor?: number; reason?: string; actor: Actor },
): Promise<RefundOutcome | null> {
  const status = REFUND_STATUS[refund.status] ?? "PENDING";

  const run = () =>
    db.$transaction(async (tx) => {
      const txn = await tx.transaction.findUnique({ where: { captureId: ctx.captureId } });
      if (!txn) return null;

      const existing = await tx.refund.findUnique({ where: { paypalRefundId: refund.id } });
      const amountMinor = refund.amount ? fromPayPalValue(refund.amount.value) : (existing?.amountMinor ?? ctx.fallbackAmountMinor);
      if (!amountMinor) throw new Error(`Refund ${refund.id} has no amount`);
      const countsNow = status === "COMPLETED" && existing?.status !== "COMPLETED";

      if (existing) {
        if (existing.status !== status) await tx.refund.update({ where: { id: existing.id }, data: { status } });
      } else {
        await tx.refund.create({
          data: {
            transactionId: txn.id,
            paypalRefundId: refund.id,
            amountMinor,
            currency: txn.currency,
            status,
            reason: ctx.reason?.slice(0, 255) ?? null,
          },
        });
      }

      let invoiceReopened = false;
      if (countsNow) {
        const updated = await tx.transaction.update({ where: { id: txn.id }, data: { refundedMinor: { increment: amountMinor } } });
        if (updated.refundedMinor >= updated.amountMinor) {
          await tx.transaction.update({ where: { id: txn.id }, data: { status: "REFUNDED" } });
        }

        if (txn.invoiceId) {
          // Atomic decrement so a payment landing at the same moment isn't overwritten.
          const invoice = await tx.invoice.update({ where: { id: txn.invoiceId }, data: { amountPaidMinor: { decrement: amountMinor } } });
          // Same rule as invoiceAfterRefund, applied to the already-decremented row.
          invoiceReopened = invoiceAfterRefund({ ...invoice, amountPaidMinor: invoice.amountPaidMinor + amountMinor }, amountMinor).reopened;
          if (invoiceReopened) await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PENDING", paidAt: null } });
        }
      }

      if (!existing || existing.status !== status) {
        await audit(
          {
            userId: txn.userId,
            actor: ctx.actor,
            action: `refund.${status.toLowerCase()}`,
            entityType: txn.invoiceId ? "Invoice" : "Transaction",
            entityId: txn.invoiceId ?? txn.id,
            metadata: { refundId: refund.id, captureId: ctx.captureId, amountMinor, invoiceReopened },
          },
          tx,
        );
      }

      const state: RefundOutcome["state"] = status === "COMPLETED" ? "refunded" : status === "PENDING" ? "pending" : "failed";
      return { state, amountMinor, currency: txn.currency, invoiceReopened };
    });

  try {
    return await run();
  } catch (error) {
    // The app and a webhook can record the same refund at once; the loser retries and sees it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return run();
    throw error;
  }
}

/** Capture id from a refund resource's "up" link (how PayPal webhooks point back to the capture). */
export function captureIdFromRefund(refund: PayPalRefund): string | null {
  const up = refund.links?.find((link) => link.rel === "up")?.href;
  const match = up ? /\/captures\/([^/?#]+)/.exec(up) : null;
  return match ? decodeURIComponent(match[1]) : null;
}
