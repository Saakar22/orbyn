import { describe, expect, it } from "vitest";
import { balanceDue, checkPaymentAmount, displayStatus, settleAfterPayment } from "@/lib/payments";

describe("checkPaymentAmount", () => {
  it("accepts the full balance and anything between the minimum and the balance", () => {
    expect(checkPaymentAmount(50_000, 50_000).ok).toBe(true);
    expect(checkPaymentAmount(100, 50_000).ok).toBe(true);
    expect(checkPaymentAmount(12_345, 50_000).ok).toBe(true);
  });

  it("rejects overpayment, zero, negatives and fractions of a cent", () => {
    expect(checkPaymentAmount(50_001, 50_000).ok).toBe(false);
    expect(checkPaymentAmount(0, 50_000).ok).toBe(false);
    expect(checkPaymentAmount(-100, 50_000).ok).toBe(false);
    expect(checkPaymentAmount(100.5, 50_000).ok).toBe(false);
  });

  it("enforces the 1.00 minimum unless the remaining balance is smaller", () => {
    expect(checkPaymentAmount(99, 50_000).ok).toBe(false);
    expect(checkPaymentAmount(40, 40).ok).toBe(true);
    expect(checkPaymentAmount(39, 40).ok).toBe(false);
  });

  it("rejects any payment once nothing is due", () => {
    expect(checkPaymentAmount(100, 0).ok).toBe(false);
  });
});

describe("settleAfterPayment", () => {
  const at = new Date("2026-11-10T10:00:00Z");

  it("marks the invoice PAID once the paid amount reaches the total", () => {
    expect(settleAfterPayment({ totalMinor: 1000, status: "PENDING" }, 1000, at)).toEqual({ status: "PAID", paidAt: at });
    expect(settleAfterPayment({ totalMinor: 1000, status: "OVERDUE" }, 1200, at)).toEqual({ status: "PAID", paidAt: at });
  });

  it("leaves a partially paid invoice in its current status", () => {
    expect(settleAfterPayment({ totalMinor: 1000, status: "OVERDUE" }, 400, at)).toEqual({ status: "OVERDUE", paidAt: null });
  });
});

describe("balance and display status", () => {
  it("never reports a negative balance", () => {
    expect(balanceDue({ totalMinor: 1000, amountPaidMinor: 400 })).toBe(600);
    expect(balanceDue({ totalMinor: 1000, amountPaidMinor: 1500 })).toBe(0);
  });

  it("shows partially paid for pending invoices but keeps overdue visible", () => {
    expect(displayStatus({ status: "PENDING", amountPaidMinor: 400 })).toBe("PARTIALLY_PAID");
    expect(displayStatus({ status: "OVERDUE", amountPaidMinor: 400 })).toBe("OVERDUE");
    expect(displayStatus({ status: "PENDING", amountPaidMinor: 0 })).toBe("PENDING");
    expect(displayStatus({ status: "PAID", amountPaidMinor: 1000 })).toBe("PAID");
  });
});
