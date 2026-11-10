import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { audit, type Actor } from "@/server/services/audit";
import { computeTotals, SUPPORTED_CURRENCIES, toMinor } from "@/lib/money";

const DAY_MS = 86_400_000;

export const invoiceItemInput = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(10_000),
  unitPrice: z.number().positive().max(1_000_000),
});

export const createInvoiceInput = z.object({
  clientName: z.string().trim().min(1).max(100),
  clientEmail: z.email().optional(),
  clientCompany: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  items: z.array(invoiceItemInput).min(1).max(50),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  taxRatePercent: z.number().min(0).max(50).default(0),
  dueInDays: z.number().int().min(0).max(365).optional(),
  dueDate: z.coerce.date().optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceInput>;

/** Normalised, server-computed invoice draft. This is what a preview card shows and what gets saved. */
export type InvoiceDraft = {
  client: { id: string | null; name: string; email: string | null; company: string | null };
  description: string | null;
  currency: string;
  items: { description: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
  subtotalMinor: number;
  taxRateBps: number;
  taxMinor: number;
  totalMinor: number;
  dueDate: string;
};

export async function findClientByName(userId: string, name: string) {
  const exact = await db.client.findFirst({
    where: { userId, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (exact) return { match: exact, candidates: [exact] };
  const candidates = await db.client.findMany({
    where: { userId, name: { contains: name.trim(), mode: "insensitive" } },
    take: 5,
  });
  return { match: candidates.length === 1 ? candidates[0] : null, candidates };
}

export async function buildInvoiceDraft(userId: string, raw: CreateInvoiceInput): Promise<InvoiceDraft> {
  const input = createInvoiceInput.parse(raw);
  const { match } = await findClientByName(userId, input.clientName);
  const items = input.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceMinor: toMinor(item.unitPrice),
  }));
  const taxRateBps = Math.round(input.taxRatePercent * 100);
  const totals = computeTotals(items, taxRateBps);
  const due = input.dueDate ?? new Date(Date.now() + (input.dueInDays ?? 14) * DAY_MS);

  return {
    client: {
      id: match?.id ?? null,
      name: match?.name ?? input.clientName,
      email: match?.email ?? input.clientEmail ?? null,
      company: match?.company ?? input.clientCompany ?? null,
    },
    description: input.description ?? items[0].description,
    currency: input.currency,
    items: items.map((item, i) => ({ ...item, totalMinor: totals.lines[i] })),
    subtotalMinor: totals.subtotalMinor,
    taxRateBps,
    taxMinor: totals.taxMinor,
    totalMinor: totals.totalMinor,
    dueDate: due.toISOString(),
  };
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.invoice.count({ where: { userId } });
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Persist a draft. The form saves straight to PENDING; the agent saves a DRAFT that the user must
 * approve via issueInvoice. Totals are re-derived here, never trusted from the caller.
 */
export async function saveInvoiceDraft(
  userId: string,
  draft: InvoiceDraft,
  actor: Actor,
  status: "DRAFT" | "PENDING" = "PENDING",
) {
  const totals = computeTotals(draft.items, draft.taxRateBps);

  return db.$transaction(async (tx) => {
    const client =
      (draft.client.id && (await tx.client.findFirst({ where: { id: draft.client.id, userId } }))) ||
      (await tx.client.upsert({
        where: { userId_name: { userId, name: draft.client.name } },
        update: {},
        create: {
          userId,
          name: draft.client.name,
          email: draft.client.email,
          company: draft.client.company,
          source: actor === "agent" ? "AGENT" : "USER",
        },
      }));

    const invoice = await tx.invoice.create({
      data: {
        userId,
        clientId: client.id,
        invoiceNumber: await nextInvoiceNumber(tx, userId),
        description: draft.description,
        currency: draft.currency,
        subtotalMinor: totals.subtotalMinor,
        taxRateBps: draft.taxRateBps,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        status,
        dueDate: new Date(draft.dueDate),
        publicToken: randomBytes(32).toString("base64url"),
        source: actor === "agent" ? "AGENT" : "USER",
        items: {
          create: draft.items.map((item, position) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            totalMinor: totals.lines[position],
            position,
          })),
        },
      },
      include: { client: true, items: { orderBy: { position: "asc" } } },
    });

    await audit(
      {
        userId,
        actor,
        action: status === "DRAFT" ? "invoice.drafted" : "invoice.created",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, totalMinor: invoice.totalMinor },
      },
      tx,
    );
    return invoice;
  });
}

/** Invoices past due that are still unpaid are reported as OVERDUE even before the cron flips them. */
export function effectiveStatus(invoice: { status: InvoiceStatus; dueDate: Date }): InvoiceStatus {
  if (invoice.status === "PENDING" && invoice.dueDate.getTime() < Date.now()) return "OVERDUE";
  return invoice.status;
}

export const listInvoicesInput = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED", "UNPAID"]).optional(),
  clientName: z.string().trim().max(100).optional(),
  query: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export async function listInvoices(userId: string, raw: z.input<typeof listInvoicesInput> = {}) {
  const input = listInvoicesInput.parse(raw);
  const now = new Date();
  const where: Prisma.InvoiceWhereInput = { userId };

  if (input.status === "OVERDUE") {
    where.OR = [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: now } }];
  } else if (input.status === "PENDING") {
    where.status = "PENDING";
    where.dueDate = { gte: now };
  } else if (input.status === "UNPAID") {
    where.status = { in: ["PENDING", "OVERDUE"] };
  } else if (input.status) {
    where.status = input.status;
  }
  if (input.clientName) where.client = { name: { contains: input.clientName, mode: "insensitive" } };
  if (input.query) {
    where.AND = [
      {
        OR: [
          { invoiceNumber: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { client: { name: { contains: input.query, mode: "insensitive" } } },
        ],
      },
    ];
  }

  const invoices = await db.invoice.findMany({
    where,
    include: { client: true },
    orderBy: { issueDate: "desc" },
    take: input.limit,
  });
  return invoices.map((invoice) => ({ ...invoice, status: effectiveStatus(invoice) }));
}

export async function getInvoice(userId: string, ref: { id?: string; invoiceNumber?: string }) {
  if (!ref.id && !ref.invoiceNumber) return null;
  const invoice = await db.invoice.findFirst({
    where: { userId, ...(ref.id ? { id: ref.id } : { invoiceNumber: ref.invoiceNumber!.toUpperCase() }) },
    include: {
      client: true,
      items: { orderBy: { position: "asc" } },
      orders: { orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { scheduledAt: "desc" } },
    },
  });
  return invoice ? { ...invoice, status: effectiveStatus(invoice) } : null;
}

/** DRAFT -> PENDING. Called only after the user approved the agent's issue_invoice request. */
export async function issueInvoice(userId: string, invoiceId: string, actor: Actor) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, userId }, include: { client: true } });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "DRAFT") {
      // Idempotent: issuing twice is a no-op rather than an error.
      return { invoice, alreadyIssued: invoice.status !== "CANCELLED" };
    }
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "PENDING", issueDate: new Date() },
      include: { client: true },
    });
    await audit(
      {
        userId,
        actor,
        action: "invoice.issued",
        entityType: "Invoice",
        entityId: invoiceId,
        metadata: { invoiceNumber: updated.invoiceNumber, totalMinor: updated.totalMinor },
      },
      tx,
    );
    return { invoice: updated, alreadyIssued: false };
  });
}

/** Statuses a user may set by hand. PAID is only ever set by verified payment capture. */
const MANUAL_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CANCELLED"],
  OVERDUE: ["CANCELLED"],
};

export async function setInvoiceStatus(userId: string, id: string, next: InvoiceStatus, actor: Actor) {
  const invoice = await db.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw new Error("Invoice not found");
  if (!MANUAL_TRANSITIONS[invoice.status]?.includes(next)) {
    throw new Error(`Cannot change invoice from ${invoice.status} to ${next}`);
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.invoice.update({ where: { id }, data: { status: next } });
    await audit(
      { userId, actor, action: `invoice.${next.toLowerCase()}`, entityType: "Invoice", entityId: id },
      tx,
    );
    return updated;
  });
}
