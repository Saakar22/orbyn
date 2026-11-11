import "server-only";

// Minimal PayPal REST client (Orders v2 + webhook verification). Server-only: uses the client secret.

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issue?: string,
    readonly debugId?: string,
  ) {
    super(message);
  }
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl() {
  return process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new PayPalError("PayPal is not configured", 500);

  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) throw new PayPalError("PayPal authentication failed", response.status);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; requestId?: string }): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;

  const response = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const issue = body?.details?.[0]?.issue ?? body?.name;
    throw new PayPalError(body?.message ?? `PayPal request failed (${response.status})`, response.status, issue, body?.debug_id);
  }
  return body as T;
}

type Money = { currency_code: string; value: string };

export type PayPalCapture = {
  id: string;
  status: "COMPLETED" | "PENDING" | "DECLINED" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED";
  amount: Money;
  custom_id?: string;
  create_time?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
};

export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  payer?: { email_address?: string };
  purchase_units: {
    reference_id?: string;
    custom_id?: string;
    amount: Money;
    payments?: { captures?: PayPalCapture[] };
  }[];
};

export function createOrder(input: {
  requestId: string;
  invoiceId: string;
  description: string;
  currency: string;
  value: string;
}) {
  return call<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: input.requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.invoiceId,
          custom_id: input.invoiceId,
          description: input.description.slice(0, 127),
          amount: { currency_code: input.currency, value: input.value },
        },
      ],
      payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" } } },
    },
  });
}

export function captureOrder(orderId: string, requestId: string) {
  return call<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    requestId,
    body: {},
  });
}

export function getOrder(orderId: string) {
  return call<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export type PayPalRefund = {
  id: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED" | "FAILED";
  amount?: Money;
  links?: { rel: string; href: string }[];
};

/** Refund part or all of a capture. The same requestId always yields the same refund. */
export function refundCapture(captureId: string, input: { requestId: string; currency: string; value: string; note?: string }) {
  return call<PayPalRefund>(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    requestId: input.requestId,
    body: {
      amount: { currency_code: input.currency, value: input.value },
      ...(input.note ? { note_to_payer: input.note.slice(0, 255) } : {}),
    },
  });
}

/** Ask PayPal whether a webhook delivery is genuine. Requires PAYPAL_WEBHOOK_ID. */
export async function verifyWebhookSignature(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const get = (name: string) => headers.get(name) ?? "";
  const result = await call<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: get("paypal-auth-algo"),
      cert_url: get("paypal-cert-url"),
      transmission_id: get("paypal-transmission-id"),
      transmission_sig: get("paypal-transmission-sig"),
      transmission_time: get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return result.verification_status === "SUCCESS";
}
