"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { Ban, Check, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { OrbynUIMessage } from "@/server/agent/tools";
import {
  type DraftInvoiceOutput,
  InvoiceDetailCard,
  InvoiceListCard,
  InvoicePreviewCard,
  SummaryCard,
  TransactionsCard,
} from "./cards";

type ToolPart = Extract<OrbynUIMessage["parts"][number], { toolCallId: string }>;
type Respond = (args: { id: string; approved: boolean; reason?: string }) => void;

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  find_clients: { running: "Looking up clients", done: "Looked up clients" },
  get_invoices: { running: "Fetching invoices", done: "Fetched invoices" },
  get_invoice_details: { running: "Opening invoice", done: "Opened invoice" },
  draft_invoice: { running: "Drafting invoice", done: "Drafted invoice" },
  issue_invoice: { running: "Issuing invoice", done: "Issued invoice" },
  get_overdue_invoices: { running: "Checking overdue invoices", done: "Checked overdue invoices" },
  get_financial_summary: { running: "Calculating financial summary", done: "Calculated financial summary" },
  get_recent_transactions: { running: "Fetching transactions", done: "Fetched transactions" },
};

function toolName(part: ToolPart) {
  return part.type.replace(/^tool-/, "");
}

export function ToolChip({ name, state }: { name: string; state: "running" | "done" | "error" | "denied" }) {
  const label = TOOL_LABELS[name] ?? { running: name, done: name };
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-[11px] text-muted-foreground">
      {state === "running" ? <Loader2 className="size-3 animate-spin text-ai" /> : null}
      {state === "done" ? <Check className="size-3 text-success" /> : null}
      {state === "error" ? <CircleAlert className="size-3 text-danger" /> : null}
      {state === "denied" ? <Ban className="size-3" /> : null}
      <span>{state === "running" ? `${label.running}…` : state === "denied" ? "Not approved" : label.done}</span>
      <code className="font-mono text-[10px] text-muted-foreground/70">{name}</code>
    </div>
  );
}

function ApprovalBar({ title, detail, onApprove, onDeny, approveLabel }: {
  title: string;
  detail: ReactNode;
  onApprove: () => void;
  onDeny: () => void;
  approveLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t bg-ai-soft/60 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ai" />
        <div>
          <div className="text-[13px] font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={onDeny}>
          Decline
        </Button>
        <Button size="sm" onClick={onApprove}>
          {approveLabel}
        </Button>
      </div>
    </div>
  );
}

/** Find the draft_invoice output for an invoice in this message, so approvals show server-computed totals. */
function findDraft(message: OrbynUIMessage, invoiceId: string | undefined) {
  for (const part of message.parts) {
    if (part.type === "tool-draft_invoice" && part.state === "output-available") {
      const output = part.output as DraftInvoiceOutput;
      if (output.invoiceId === invoiceId) return output;
    }
  }
  return null;
}

function renderToolPart(part: ToolPart, message: OrbynUIMessage, respond: Respond): ReactNode {
  const name = toolName(part);

  if (part.state === "input-streaming" || part.state === "input-available") return <ToolChip name={name} state="running" />;
  if (part.state === "output-error") {
    return (
      <div className="space-y-1">
        <ToolChip name={name} state="error" />
        <p className="text-xs text-danger">{part.errorText}</p>
      </div>
    );
  }
  if (part.state === "output-denied") return <ToolChip name={name} state="denied" />;

  // issue_invoice: the approval UI is attached to the draft preview card (see draft_invoice below).
  if (name === "issue_invoice") {
    if (part.state === "approval-requested" || part.state === "approval-responded") {
      const input = part.input as { invoiceId?: string };
      if (findDraft(message, input.invoiceId)) return null;
      // Fallback when the draft came from an earlier turn.
      return part.state === "approval-requested" ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ApprovalBar
            title="Issue this invoice?"
            detail="It becomes payable through PayPal once issued."
            approveLabel="Approve & issue"
            onApprove={() => respond({ id: part.approval.id, approved: true })}
            onDeny={() => respond({ id: part.approval.id, approved: false })}
          />
        </div>
      ) : (
        <ToolChip name={name} state="running" />
      );
    }
    if (part.state === "output-available") {
      return findDraft(message, (part.input as { invoiceId: string }).invoiceId) ? null : <ToolChip name={name} state="done" />;
    }
  }

  if (part.state !== "output-available") return null;
  const output = part.output as Record<string, unknown>;

  switch (name) {
    case "draft_invoice": {
      const draft = output as unknown as DraftInvoiceOutput;
      const issue = message.parts.find(
        (p): p is ToolPart =>
          p.type === "tool-issue_invoice" && (p.input as { invoiceId?: string } | undefined)?.invoiceId === draft.invoiceId,
      );
      let status = draft.status;
      let footer: ReactNode = null;
      if (issue?.state === "approval-requested") {
        footer = (
          <ApprovalBar
            title={`Issue ${draft.invoiceNumber} to ${draft.client.name}?`}
            detail={`${formatMoney(draft.totalMinor, draft.currency)} · becomes payable through PayPal`}
            approveLabel="Approve & issue"
            onApprove={() => respond({ id: issue.approval.id, approved: true })}
            onDeny={() => respond({ id: issue.approval.id, approved: false, reason: "User declined" })}
          />
        );
      } else if (issue?.state === "approval-responded" || issue?.state === "input-available") {
        footer = (
          <div className="flex items-center gap-2 border-t px-3.5 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Issuing…
          </div>
        );
      } else if (issue?.state === "output-available") {
        status = (issue.output as { status: string }).status;
        footer = (
          <div className="flex items-center gap-2 border-t px-3.5 py-2 text-xs text-success">
            <Check className="size-3.5" /> Approved and issued. Ready for PayPal checkout.
          </div>
        );
      } else if (issue?.state === "output-denied") {
        footer = <div className="border-t px-3.5 py-2 text-xs text-muted-foreground">Not issued. The draft is saved.</div>;
      }
      return <InvoicePreviewCard draft={draft} status={status} footer={footer} />;
    }
    case "get_invoices":
      return (
        <InvoiceListCard
          title="Invoices"
          invoices={output.invoices as never}
          totalMinor={output.totalMinor as number}
        />
      );
    case "get_overdue_invoices":
      return <InvoiceListCard title="Overdue invoices" invoices={output.invoices as never} totalMinor={output.totalMinor as number} />;
    case "get_financial_summary":
      return <SummaryCard summary={output as never} />;
    case "get_recent_transactions":
      return <TransactionsCard transactions={output.transactions as never} />;
    case "get_invoice_details":
      return output.error ? <ToolChip name={name} state="error" /> : <InvoiceDetailCard invoice={output as never} />;
    default:
      return <ToolChip name={name} state="done" />;
  }
}

/** Minimal formatting for model text: paragraphs and **bold**. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {paragraph.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              <Fragment key={j}>{chunk}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}

export function MessageParts({ message, respond }: { message: OrbynUIMessage; respond: Respond }) {
  return (
    <div className="space-y-2.5">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return part.text.trim() ? (
            <div key={i} className="space-y-2 text-[14px] leading-relaxed">
              <RichText text={part.text} />
            </div>
          ) : null;
        }
        if (isToolUIPart(part as UIMessage["parts"][number])) {
          const node = renderToolPart(part as ToolPart, message, respond);
          return node ? <div key={(part as ToolPart).toolCallId}>{node}</div> : null;
        }
        return null;
      })}
    </div>
  );
}
