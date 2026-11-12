import { Check, ShieldCheck } from "lucide-react";
import { SourceBadge, StatusBadge } from "@/components/shared/status-badge";

// Presentational pieces for the "how it works" story. They mirror the real assistant UI
// (same badges, same structure) but are static illustrations with sample data.

export const STORY = {
  prompt: "Invoice Alex $500 for website development",
  invoiceNumber: "INV-0042",
  client: "Alex Rivera",
  clientEmail: "alex@riverastudio.example",
  amount: "$500.00",
  description: "Website development",
  due: "14 days after issue",
  captureId: "SAMPLE-7KD42M",
};

export const STEPS = [
  { title: "Intent", body: "Type what you need the way you would say it to a colleague." },
  { title: "Plan", body: "Orbyn pulls out the client, amount, description and due date, and works out the totals on the server." },
  { title: "Approve", body: "Nothing is issued until you press Approve. Decline, and the draft simply waits." },
  { title: "Verified", body: "Your client pays through PayPal. The invoice turns paid only after PayPal confirms the money was captured." },
];

export function ChatBubble() {
  return (
    <div className="story-bubble">
      <span className="sr-only">You: </span>
      {STORY.prompt}
    </div>
  );
}

export function Thinking() {
  return (
    <div className="story-thinking">
      <span className="story-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      Reading your request
    </div>
  );
}

export function CardHeader({ status, children }: { status?: string; children?: React.ReactNode }) {
  return (
    <div className="story-card-header">
      <span className="font-medium">Invoice {STORY.invoiceNumber}</span>
      {children ?? (status ? <StatusBadge status={status} /> : null)}
    </div>
  );
}

const FIELDS = [
  { label: "Client", value: STORY.client, hint: STORY.clientEmail },
  { label: "Amount", value: STORY.amount },
  { label: "For", value: STORY.description },
  { label: "Due", value: STORY.due },
];

export function PlanFields() {
  return (
    <dl className="story-fields">
      {FIELDS.map((field) => (
        <div key={field.label} data-field>
          <dt>{field.label}</dt>
          <dd>
            {field.value}
            {field.hint ? <span>{field.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Looks like the app's approval bar. The buttons are part of the illustration, not controls. */
export function ApprovalBar({ pressed = false }: { pressed?: boolean }) {
  return (
    <div className="story-approval">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--indigo)]" aria-hidden />
        <div>
          <p className="text-[13px] font-medium">
            Issue {STORY.invoiceNumber} to {STORY.client}?
          </p>
          <p className="text-xs text-[var(--ink-soft)]">{STORY.amount}, payable through PayPal once issued</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2" aria-hidden>
        <span className="story-btn story-btn-ghost">Decline</span>
        <span className="story-btn story-btn-primary" data-approve data-pressed={pressed || undefined}>
          <span data-approve-idle>Approve and issue</span>
          <span data-approve-done>
            <Check className="size-3.5" /> Approved
          </span>
        </span>
      </div>
      <span className="sr-only">{pressed ? "You approved it." : "Waiting for your approval."}</span>
    </div>
  );
}

export function Receipt() {
  return (
    <div className="story-receipt">
      <div className="flex items-center gap-3.5">
        <svg viewBox="0 0 44 44" className="size-11 shrink-0" aria-hidden>
          <circle cx="22" cy="22" r="21" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="1" />
          <path data-check d="M13.5 22.5l6 6 11.5-12.5" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </svg>
        <div>
          <p className="text-[13px] text-[var(--ink-soft)]">Payment received</p>
          <p className="font-display text-[2rem] leading-none tabular">{STORY.amount}</p>
        </div>
        <span className="ml-auto self-start">
          <SourceBadge source="PAYPAL_SANDBOX" />
        </span>
      </div>
      <dl className="story-fields mt-4">
        <div>
          <dt>Paid by</dt>
          <dd>{STORY.clientEmail}</dd>
        </div>
        <div>
          <dt>PayPal capture</dt>
          <dd>{STORY.captureId}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Verified by the server before the invoice was marked paid</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-[var(--ink-soft)]">Illustration with sample data, not a real receipt.</p>
    </div>
  );
}
