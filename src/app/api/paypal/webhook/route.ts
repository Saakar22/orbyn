import { verifyWebhookSignature } from "@/server/paypal/client";
import { processWebhookEvent } from "@/server/services/payments";

// PayPal webhook receiver. Disabled until PAYPAL_WEBHOOK_ID is set (PayPal needs a public URL to deliver to).
export async function POST(request: Request) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return Response.json({ error: "Webhooks are not configured" }, { status: 503 });
  }

  const event = await request.json().catch(() => null);
  if (!event || typeof event.id !== "string" || typeof event.event_type !== "string") {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyWebhookSignature(request.headers, event);
  } catch (error) {
    console.error("[paypal webhook] verification call failed", error);
    return Response.json({ error: "Verification unavailable" }, { status: 502 }); // PayPal will retry
  }
  if (!verified) return Response.json({ error: "Invalid signature" }, { status: 400 });

  try {
    const result = await processWebhookEvent(event);
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error("[paypal webhook] processing failed", event.id, event.event_type, error);
    return Response.json({ error: "Processing failed" }, { status: 500 }); // non-2xx -> PayPal retries
  }
}
