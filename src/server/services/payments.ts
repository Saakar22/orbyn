import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type TxnStatus } from "@/generated/prisma/client";
import { balanceDue, checkPaymentAmount, isPayableStatus, settleAfterPayment } from "@/lib/payments";
import { fromPayPalValue, toPayPalValue } from "@/lib/money";
import {
  captureOrder,
  createOrder,
  getOrder,
  PayPalError,
  type PayPalCapture,
  type PayPalOrder,
} from "@/server/paypal/client";
import { db } from "@/server/db";
import { audit, type Actor } from "@/server/services/audit";
import { effectiveStatus } from "@/server/services/invoices";

/** An error whose message is safe to show to the person paying. */
export class PaymentError extends Error {}

/** Everything the public pay page needs. Looked up by the unguessable public token only. */
export async function getInvoiceForPayer(publicToken: string) {
  const invoice = await db.invoice.findUnique({
    where: { publicToken },
    include: {
      client: true,
      items: { orderBy: { position: "asc" } },
      user: { select: { name: true, businessName: true, email: true } },
    },
  });
  if (!invoice || invoice.status === "DRAFT") return null;
  return { ...invoice, status: effectiveStatus(invoice) };
}

/** Create a PayPal order for `amountMinor` against the invoice's current balance. Returns the PayPal order id. */
export async function startPayment(publicToken: string, amountMinor: number) {
  const invoice = await getInvoiceForPayer(publicToken);
  if (!invoice) throw new PaymentError("This invoice could not be found.");
  if (!isPayableStatus(invoice.status)) throw new PaymentError("This invoice is not open for payment.");

  const check = checkPaymentAmount(amountMinor, balanceDue(invoice));
  if (!check.ok) throw new PaymentError(check.reason);

  const requestId = randomUUID();
  const order = await createOrder({
    requestId,
    invoiceId: invoice.id,
    description: `${invoice.invoiceNumber} · ${invoice.user.businessName ?? invoice.user.name}`,
    currency: invoice.currency,
    value: toPayPalValue(amountMinor),
  });

  await db.$transaction(async (tx) => {
    await tx.paymentOrder.create({
      data: {
        invoiceId: invoice.id,
        paypalOrderId: order.id,
        amountMinor,
        currency: invoice.currency,
        status: "CREATED",
        requestId,
      },
    });
    await audit(
      {
        userId: invoice.userId,
        actor: "system",
        action: "payment.order_created",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: { paypalOrderId: order.id, amountMinor },
      },
      tx,
    );
  });
  return order.id;
}

export type PaymentOutcome = {
  state: "paid" | "partial" | "pending" | "failed";
  amountMinor: number;
  balanceMinor: number;
  currency: string;
};

/** Capture an order the payer approved. Safe to call repeatedly: PayPal and our DB both de-duplicate. */
export async function completePayment(publicToken: string, paypalOrderId: string): Promise<PaymentOutcome> {
  const order = await db.paymentOrder.findUnique({ where: { paypalOrderId }, include: { invoice: true } });
  if (!order || order.invoice.publicToken !== publicToken) throw new PaymentError("This payment could not be found.");

  if (order.status !== "COMPLETED") {
    if (!isPayableStatus(effectiveStatus(order.invoice))) {
      await db.paymentOrder.update({ where: { id: order.id }, data: { status: "VOIDED" } });
      throw new PaymentError("This invoice is no longer open for payment. Nothing was charged.");
    }
    // Another payment may have landed since this order was created; don't let this one overpay.
    if (order.amountMinor > balanceDue(order.invoice)) {
      await db.paymentOrder.update({ where: { id: order.id }, data: { status: "VOIDED" } });
      throw new PaymentError("The balance changed while you were paying. Nothing was charged — please refresh and try again.");
    }
  }

  return captureAndRecord(order.id, paypalOrderId, "system");
}

async function captureAndRecord(orderRowId: string, paypalOrderId: string, actor: Actor): Promise<PaymentOutcome> {
  let paypalOrder: PayPalOrder;
  try {
    paypalOrder = await captureOrder(paypalOrderId, `capture-${orderRowId}`);
  } catch (error) {
    if (error instanceof PayPalError && error.issue === "ORDER_ALREADY_CAPTURED") {
      paypalOrder = await getOrder(paypalOrderId);
    } else if (error instanceof PayPalError && error.issue === "INSTRUMENT_DECLINED") {
      throw new PaymentError("PayPal declined that payment method. Please try another one.");
    } else {
      throw error;
    }
  }

  const capture = paypalOrder.purchase_units[0]?.payments?.captures?.[0];
  if (!capture) {
    await db.paymentOrder.update({ where: { id: orderRowId }, data: { status: "FAILED" } });
    throw new PaymentError("PayPal did not complete the payment.");
  }
  return recordCapture(capture, { paypalOrderId, payerEmail: paypalOrder.payer?.email_address, actor });
}

const CAPTURE_TO_TXN: Record<PayPalCapture["status"], TxnStatus> = {
  COMPLETED: "COMPLETED",
  PARTIALLY_REFUNDED: "COMPLETED",
  PENDING: "PENDING",
  DECLINED: "DENIED",
  FAILED: "DENIED",
  REFUNDED: "REFUNDED",
};

/**
 * Record a PayPal capture exactly once (captureId is unique) and, the first time it is seen as
 * COMPLETED, add it to the invoice's paid amount. Both the pay page and webhooks funnel through here.
 */
export async function recordCapture(
  capture: PayPalCapture,
  ctx: { paypalOrderId?: string; payerEmail?: string; actor: Actor },
): Promise<PaymentOutcome> {
  const paypalOrderId = ctx.paypalOrderId ?? capture.supplementary_data?.related_ids?.order_id;
  const order = paypalOrderId ? await db.paymentOrder.findUnique({ where: { paypalOrderId } }) : null;
  const invoiceId = order?.invoiceId ?? capture.custom_id;
  if (!invoiceId) throw new Error(`Capture ${capture.id} has no invoice reference`);

  const amountMinor = fromPayPalValue(capture.amount.value);
  const status = CAPTURE_TO_TXN[capture.status] ?? "PENDING";
  const capturedAt = capture.create_time ? new Date(capture.create_time) : new Date();

  const run = () =>
    db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found for capture ${capture.id}`);
      if (capture.amount.currency_code !== invoice.currency) {
        throw new Error(`Capture ${capture.id} currency ${capture.amount.currency_code} != invoice ${invoice.currency}`);
      }

      const existing = await tx.transaction.findUnique({ where: { captureId: capture.id } });
      const countsNow = status === "COMPLETED" && existing?.status !== "COMPLETED";

      if (existing) {
        if (existing.status !== status) await tx.transaction.update({ where: { id: existing.id }, data: { status } });
      } else {
        await tx.transaction.create({
          data: {
            userId: invoice.userId,
            invoiceId,
            paypalOrderId: paypalOrderId ?? null,
            captureId: capture.id,
            amountMinor,
            currency: capture.amount.currency_code,
            status,
            source: "PAYPAL_SANDBOX",
            payerEmail: ctx.payerEmail ?? null,
            raw: capture as unknown as Prisma.InputJsonValue,
            createdAt: capturedAt,
          },
        });
      }

      let current = invoice;
      if (countsNow) {
        current = await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaidMinor: { increment: amountMinor } } });
        const settled = settleAfterPayment(current, current.amountPaidMinor, capturedAt);
        if (settled.status === "PAID" && current.status !== "PAID") {
          current = await tx.invoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: settled.paidAt } });
        }
      }

      if (order) {
        const orderStatus = status === "DENIED" ? "FAILED" : "COMPLETED";
        if (order.status !== orderStatus) await tx.paymentOrder.update({ where: { id: order.id }, data: { status: orderStatus } });
      }

      if (!existing || existing.status !== status) {
        await audit(
          {
            userId: invoice.userId,
            actor: ctx.actor,
            action: `payment.${status.toLowerCase()}`,
            entityType: "Invoice",
            entityId: invoiceId,
            metadata: { captureId: capture.id, amountMinor, amountPaidMinor: current.amountPaidMinor },
          },
          tx,
        );
      }

      const balanceMinor = balanceDue(current);
      const state: PaymentOutcome["state"] =
        status === "DENIED" ? "failed" : status !== "COMPLETED" ? "pending" : balanceMinor === 0 ? "paid" : "partial";
      return { state, amountMinor, balanceMinor, currency: invoice.currency };
    });

  try {
    return await run();
  } catch (error) {
    // The pay page and a webhook can record the same capture at the same moment; the loser retries and sees it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return run();
    throw error;
  }
}

type WebhookEvent = { id: string; event_type: string; resource?: Record<string, unknown> };

/** Apply a verified PayPal webhook. De-duplicated by event id. */
export async function processWebhookEvent(event: WebhookEvent) {
  const existing = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (existing?.processedAt) return { duplicate: true };
  if (!existing) {
    await db.webhookEvent
      .create({
        data: {
          id: event.id,
          eventType: event.event_type,
          resourceId: typeof event.resource?.id === "string" ? event.resource.id : null,
          verified: true,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      })
      .catch((error) => {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      });
  }

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
    case "PAYMENT.CAPTURE.PENDING":
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      await recordCapture(event.resource as unknown as PayPalCapture, { actor: "paypal_webhook" });
      break;
    case "CHECKOUT.ORDER.APPROVED": {
      // The payer approved but the browser may have closed before capture. Capture here; the
      // shared PayPal-Request-Id makes this a no-op if the pay page already captured it.
      const orderId = String(event.resource?.id ?? "");
      const order = orderId ? await db.paymentOrder.findUnique({ where: { paypalOrderId: orderId }, include: { invoice: true } }) : null;
      if (order && order.status !== "COMPLETED" && order.status !== "VOIDED" && order.amountMinor <= balanceDue(order.invoice)) {
        await captureAndRecord(order.id, orderId, "paypal_webhook");
      }
      break;
    }
    default:
      break; // Stored for the record; nothing to apply.
  }

  await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  return { duplicate: false };
}
