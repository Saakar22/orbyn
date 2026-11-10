// All money in Orbyn is integer minor units. Every supported currency has 2 decimals,
// which PayPal also requires for these currencies.

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Parse a major-unit amount ("500", "12.5", 12.5) into minor units without float drift. */
export function toMinor(amount: number | string): number {
  const text = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error(`Invalid amount: ${amount}`);
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = whole * 100 + fraction;
  if (!Number.isSafeInteger(minor)) throw new Error(`Amount out of range: ${amount}`);
  return minor;
}

/** Format minor units as the decimal string PayPal expects, e.g. 50000 -> "500.00". */
export function toPayPalValue(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error(`Invalid minor amount: ${minor}`);
  const whole = Math.floor(minor / 100);
  const fraction = String(minor % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Parse a PayPal decimal string back into minor units. */
export function fromPayPalValue(value: string): number {
  return toMinor(value);
}

export function formatMoney(minor: number, currency: string = "USD", opts?: { compact?: boolean }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 2,
    minimumFractionDigits: opts?.compact ? 0 : 2,
  }).format(minor / 100);
}

export type LineInput = { quantity: number; unitPriceMinor: number };

/** Compute invoice totals on the server. Tax is in basis points (e.g. 1800 = 18%), rounded half-up. */
export function computeTotals(items: LineInput[], taxRateBps = 0) {
  const lines = items.map((item) => item.quantity * item.unitPriceMinor);
  const subtotalMinor = lines.reduce((sum, value) => sum + value, 0);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10_000);
  return { lines, subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor };
}
