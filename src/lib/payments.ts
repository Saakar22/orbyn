// Pure payment rules shared by the server and the pay page. All amounts are integer minor units.

/** Smallest partial payment accepted (1.00 in every supported currency). */
export const MIN_PAYMENT_MINOR = 100;

export const PAYABLE_STATUSES = ["PENDING", "OVERDUE"] as const;

export function isPayableStatus(status: string): boolean {
  return (PAYABLE_STATUSES as readonly string[]).includes(status);
}

export function balanceDue(invoice: { totalMinor: number; amountPaidMinor: number }): number {
  return Math.max(0, invoice.totalMinor - invoice.amountPaidMinor);
}

export type AmountCheck = { ok: true } | { ok: false; reason: string };

/**
 * A payment must be a whole number of minor units, no more than the balance, and at least
 * MIN_PAYMENT_MINOR — unless the balance itself is smaller, in which case it must clear it exactly.
 */
export function checkPaymentAmount(amountMinor: number, balanceMinor: number): AmountCheck {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return { ok: false, reason: "Enter an amount greater than zero." };
  if (balanceMinor <= 0) return { ok: false, reason: "This invoice has nothing left to pay." };
  if (amountMinor > balanceMinor) return { ok: false, reason: "The amount is more than the balance due." };
  const minimum = Math.min(MIN_PAYMENT_MINOR, balanceMinor);
  if (amountMinor < minimum) return { ok: false, reason: "The minimum payment is 1.00." };
  return { ok: true };
}

/** Status and paid date after a completed capture brings the paid amount to `amountPaidMinor`. */
export function settleAfterPayment(
  invoice: { totalMinor: number; status: string },
  amountPaidMinor: number,
  capturedAt: Date,
): { status: string; paidAt: Date | null } {
  if (amountPaidMinor >= invoice.totalMinor) return { status: "PAID", paidAt: capturedAt };
  return { status: invoice.status, paidAt: null };
}

/** "Partially paid" is a display state: the stored status stays PENDING/OVERDUE so due-date logic keeps working. */
export function displayStatus(invoice: { status: string; amountPaidMinor: number }): string {
  if (isPayableStatus(invoice.status) && invoice.amountPaidMinor > 0) {
    return invoice.status === "OVERDUE" ? "OVERDUE" : "PARTIALLY_PAID";
  }
  return invoice.status;
}
