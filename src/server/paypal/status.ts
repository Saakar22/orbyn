import "server-only";

/** Whether this server has PayPal credentials, and whether they point at the sandbox. Never exposes the values. */
export function paypalStatus() {
  return {
    connected: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    sandbox: process.env.PAYPAL_ENV === "sandbox" && (process.env.PAYPAL_BASE_URL ?? "").includes("sandbox"),
  };
}
