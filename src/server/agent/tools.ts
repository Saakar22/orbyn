import "server-only";
import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { balanceDue } from "@/lib/payments";
import { REMINDER_TONES } from "@/lib/reminders";
import { db } from "@/server/db";
import {
  getFinancialSummary,
  getOverdueInvoices,
  getRecentTransactions,
  recentTransactionsInput,
  summaryInput,
} from "@/server/services/analytics";
import {
  buildInvoiceDraft,
  createInvoiceInput,
  getInvoice,
  issueInvoice,
  listInvoices,
  listInvoicesInput,
  saveInvoiceDraft,
} from "@/server/services/invoices";
import { createReminder, ReminderError, scheduleReminder } from "@/server/services/reminders";

/**
 * Permission tiers. READ and DRAFT tools run automatically; APPROVAL tools pause the agent loop
 * until the user explicitly approves in the UI. Approvals are HMAC-signed and checked against
 * server-held history (see chat route), and every tool re-validates against the database.
 */
export const APPROVAL_TOOLS = ["issue_invoice", "schedule_reminder"] as const;

type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>[number];

function invoiceSummary(invoice: InvoiceRow) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.client.name,
    description: invoice.description,
    status: invoice.status,
    totalMinor: invoice.totalMinor,
    amountPaidMinor: invoice.amountPaidMinor,
    balanceMinor: balanceDue(invoice),
    currency: invoice.currency,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    source: invoice.source,
  };
}

/** Tools are built per request so the authenticated workspaceId is captured server-side, never model-supplied. */
export function createOrbynTools(workspaceId: string) {
  return {
    find_clients: tool({
      description:
        "Search the user's clients by name or company. Use before drafting an invoice when the client name is ambiguous.",
      inputSchema: z.object({ query: z.string().min(1).max(100) }),
      execute: async ({ query }) => {
        const clients = await db.client.findMany({
          where: {
            workspaceId,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { company: { contains: query, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, email: true, company: true },
          take: 8,
        });
        return { clients };
      },
    }),

    get_invoices: tool({
      description:
        "List invoices. status: UNPAID (pending or overdue), OVERDUE, PENDING (not yet due), PAID, DRAFT, CANCELLED. Omit for all.",
      inputSchema: listInvoicesInput.pick({ status: true, clientName: true }).extend({
        limit: z.number().int().min(1).max(25).default(10),
      }),
      execute: async (input) => {
        const invoices = await listInvoices(workspaceId, input);
        return {
          invoices: invoices.map(invoiceSummary),
          totalMinor: invoices.reduce((sum, invoice) => sum + invoice.totalMinor, 0),
          count: invoices.length,
        };
      },
    }),

    get_invoice_details: tool({
      description: "Get one invoice with line items, payment orders, transactions and reminders.",
      inputSchema: z.object({
        invoiceNumber: z.string().regex(/^INV-\d{4,}$/i).optional().describe("e.g. INV-0012"),
        invoiceId: z.string().optional(),
      }),
      execute: async ({ invoiceNumber, invoiceId }) => {
        const invoice = await getInvoice(workspaceId, { id: invoiceId, invoiceNumber });
        if (!invoice) return { error: "Invoice not found." };
        return {
          ...invoiceSummary(invoice),
          items: invoice.items.map(({ description, quantity, unitPriceMinor, totalMinor }) => ({
            description,
            quantity,
            unitPriceMinor,
            totalMinor,
          })),
          subtotalMinor: invoice.subtotalMinor,
          taxMinor: invoice.taxMinor,
          payPath: `/pay/${invoice.publicToken}`,
          orders: invoice.orders.map((o) => ({ paypalOrderId: o.paypalOrderId, status: o.status })),
          transactions: invoice.transactions.map((t) => ({
            status: t.status,
            amountMinor: t.amountMinor,
            refundedMinor: t.refundedMinor,
            captureId: t.captureId,
            source: t.source,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      },
    }),

    draft_invoice: tool({
      description:
        "Prepare an invoice DRAFT with server-computed totals. Does not issue it. After drafting, call issue_invoice " +
        "with the returned invoiceId so the user can review and approve. Amounts are in major units (500 = $500.00).",
      inputSchema: createInvoiceInput.omit({ dueDate: true }),
      execute: async (input) => {
        const draft = await buildInvoiceDraft(workspaceId, input);
        const invoice = await saveInvoiceDraft(workspaceId, draft, "agent", "DRAFT");
        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          isNewClient: draft.client.id === null,
          client: draft.client,
          description: draft.description,
          items: draft.items,
          currency: draft.currency,
          subtotalMinor: draft.subtotalMinor,
          taxMinor: draft.taxMinor,
          totalMinor: draft.totalMinor,
          dueDate: draft.dueDate,
        };
      },
    }),

    issue_invoice: tool({
      description:
        "Issue a drafted invoice (DRAFT -> PENDING) so it can be paid. Requires the user's approval in the UI.",
      inputSchema: z.object({ invoiceId: z.string().min(1) }),
      execute: async ({ invoiceId }) => {
        const { invoice, alreadyIssued } = await issueInvoice(workspaceId, invoiceId, "agent");
        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          client: invoice.client.name,
          totalMinor: invoice.totalMinor,
          currency: invoice.currency,
          dueDate: invoice.dueDate.toISOString(),
          alreadyIssued,
        };
      },
    }),

    draft_reminder: tool({
      description:
        "Draft a payment reminder for an unpaid invoice. Saves a DRAFT only; then call schedule_reminder with the " +
        "returned reminderId so the user can review and approve. Omit message to use Orbyn's template for the tone. " +
        "Tone: polite (not yet due or just due), firm (overdue), final (long overdue).",
      inputSchema: z.object({
        invoiceNumber: z.string().regex(/^INV-\d{4,}$/i).describe("e.g. INV-0012"),
        tone: z.enum(REMINDER_TONES).default("polite"),
        message: z.string().trim().min(1).max(2000).optional().describe("Full reminder text, if writing a custom one"),
        sendInDays: z.number().int().min(0).max(60).default(0).describe("0 = ready to send today"),
      }),
      execute: async ({ invoiceNumber, tone, message, sendInDays }) => {
        const found = await getInvoice(workspaceId, { invoiceNumber });
        if (!found) return { error: `Invoice ${invoiceNumber} not found.` };
        try {
          const { reminder, invoice } = await createReminder(
            workspaceId,
            { invoiceId: found.id, tone, message, scheduledAt: new Date(Date.now() + sendInDays * 86_400_000) },
            "agent",
            true,
          );
          return {
            reminderId: reminder.id,
            status: reminder.status,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client.name,
            clientEmail: invoice.client.email,
            tone: reminder.tone,
            message: reminder.message,
            scheduledAt: reminder.scheduledAt.toISOString(),
            balanceMinor: balanceDue(invoice),
            currency: invoice.currency,
          };
        } catch (error) {
          if (error instanceof ReminderError) return { error: error.message };
          throw error;
        }
      },
    }),

    schedule_reminder: tool({
      description: "Schedule a drafted reminder so it shows up for sending. Requires the user's approval in the UI.",
      inputSchema: z.object({ reminderId: z.string().min(1) }),
      execute: async ({ reminderId }) => {
        try {
          const { reminder, changed } = await scheduleReminder(workspaceId, reminderId, "agent");
          return { reminderId: reminder.id, status: reminder.status, scheduledAt: reminder.scheduledAt.toISOString(), alreadyScheduled: !changed };
        } catch (error) {
          if (error instanceof ReminderError) return { error: error.message };
          throw error;
        }
      },
    }),

    get_overdue_invoices: tool({
      description: "List unpaid invoices that are past their due date, most overdue first.",
      inputSchema: z.object({}),
      execute: async () => {
        const invoices = await getOverdueInvoices(workspaceId);
        return { invoices, totalMinor: invoices.reduce((sum, i) => sum + i.balanceMinor, 0), count: invoices.length };
      },
    }),

    get_financial_summary: tool({
      description:
        "Revenue (completed payments), comparison with the previous period, outstanding and overdue balances, and the clients owing the most.",
      inputSchema: summaryInput,
      execute: async (input) => getFinancialSummary(workspaceId, input),
    }),

    get_recent_transactions: tool({
      description: "Most recent payment transactions. source=SEEDED means demo data; PAYPAL_SANDBOX means a real sandbox capture.",
      inputSchema: recentTransactionsInput,
      execute: async (input) => ({ transactions: await getRecentTransactions(workspaceId, input) }),
    }),
  };
}

export type OrbynTools = ReturnType<typeof createOrbynTools>;
export type OrbynUIMessage = UIMessage<never, never, InferUITools<OrbynTools>>;
