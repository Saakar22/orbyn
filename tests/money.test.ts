import { describe, expect, it } from "vitest";
import { computeTotals, toMinor, toPayPalValue } from "@/lib/money";

describe("money", () => {
  it("parses amounts without float drift", () => {
    expect(toMinor("0.1")).toBe(10);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor("500")).toBe(50000);
    expect(toMinor(19.99)).toBe(1999);
  });

  it("rejects malformed amounts", () => {
    expect(() => toMinor("-5")).toThrow();
    expect(() => toMinor("1.234")).toThrow();
    expect(() => toMinor("abc")).toThrow();
  });

  it("formats PayPal values", () => {
    expect(toPayPalValue(50000)).toBe("500.00");
    expect(toPayPalValue(5)).toBe("0.05");
    expect(() => toPayPalValue(-1)).toThrow();
  });

  it("computes totals with tax rounding", () => {
    const totals = computeTotals([{ quantity: 3, unitPriceMinor: 333 }], 1800);
    expect(totals.subtotalMinor).toBe(999);
    expect(totals.taxMinor).toBe(180);
    expect(totals.totalMinor).toBe(1179);
  });
});
