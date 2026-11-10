import "server-only";
import { z } from "zod";
import type { Prisma, ReminderStatus } from "@/generated/prisma/client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { balanceDue, isPayableStatus } from "@/lib/payments";
import { composeReminder, initialReminderStatus, REMINDER_TONES, type ReminderTone } from "@/lib/reminders";
import { db } from "@/server/db";
import { audit, type Actor } from "@/server/services/audit";
import { effectiveStatus } from "@/server/services/invoices";

export class ReminderError extends Error {}

export const reminderInput = z.object({
  invoiceId: z.string().min(1),
  tone: z.enum(REMINDER_TONES).default("polite"),
  message: z.string().trim().min(1).max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
});
export type ReminderInput = z.input<typeof reminderInput>;

export function payUrl(publicToken: string) {
  return new URL(`/pay/${publicToken}`, process.env.APP_URL || "http://localhost:3000").toString();
}

async function loadOpenInvoice(userId: string, invoiceId: string) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { client: true, user: { select: { name: true, businessName: true } } },
  });
  if (!invoice) throw new ReminderError("Invoice not found.");
  const status = effectiveStatus(invoice);
  if (!isPayableStatus(status) || balanceDue(invoice) === 0) {
    throw new ReminderError(`${invoice.invoiceNumber} has nothing left to collect, so it doesn't need a reminder.`);
  }
  return { ...invoice, status };
}

type OpenInvoice = Awaited<ReturnType<typeof loadOpenInvoice>>;

function defaultMessage(invoice: OpenInvoice, tone: ReminderTone) {
  return composeReminder(tone, {
    clientName: invoice.client.name,
    invoiceNumber: invoice.invoiceNumber,
    balance: formatMoney(balanceDue(invoice), invoice.currency),
    dueDate: formatDate(invoice.dueDate),
    isOverdue: invoice.status === "OVERDUE",
    payUrl: payUrl(invoice.publicToken),
    senderName: invoice.user.businessName ?? invoice.user.name,
  });
}

/** Default text for every tone, so the form can switch tone without a round trip. */
export async function reminderTemplates(userId: string, invoiceId: string) {
  const invoice = await loadOpenInvoice(userId, invoiceId);
  return Object.fromEntries(REMINDER_TONES.map((tone) => [tone, defaultMessage(invoice, tone)])) as Record<ReminderTone, string>;
}

/**
 * Create a reminder. The owner's form creates it ready to go (SCHEDULED/DUE); the assistant
 * creates a DRAFT that the owner must approve via scheduleReminder.
 */
export async function createReminder(userId: string, raw: ReminderInput, actor: Actor, asDraft = false) {
  const input = reminderInput.parse(raw);
  const invoice = await loadOpenInvoice(userId, input.invoiceId);
  const scheduledAt = input.scheduledAt ?? new Date();
  const status: ReminderStatus = asDraft ? "DRAFT" : initialReminderStatus(scheduledAt);

  return db.$transaction(async (tx) => {
    const reminder = await tx.reminder.create({
      data: {
        invoiceId: invoice.id,
        tone: input.tone,
        message: input.message ?? defaultMessage(invoice, input.tone),
        scheduledAt,
        status,
      },
    });
    await audit(
      {
        userId,
        actor,
        action: asDraft ? "reminder.drafted" : "reminder.scheduled",
        entityType: "Reminder",
        entityId: reminder.id,
        metadata: { invoiceId: invoice.id, tone: input.tone, scheduledAt: scheduledAt.toISOString() },
      },
      tx,
    );
    return { reminder, invoice };
  });
}

async function ownedReminder(userId: string, reminderId: string) {
  const reminder = await db.reminder.findFirst({
    where: { id: reminderId, invoice: { userId } },
    include: { invoice: { include: { client: true } } },
  });
  if (!reminder) throw new ReminderError("Reminder not found.");
  return reminder;
}

async function transition(
  userId: string,
  reminderId: string,
  from: ReminderStatus[],
  data: (r: Awaited<ReturnType<typeof ownedReminder>>) => Prisma.ReminderUpdateInput,
  action: string,
  actor: Actor,
) {
  const reminder = await ownedReminder(userId, reminderId);
  if (!from.includes(reminder.status)) {
    // Repeating the same transition (double click, retried approval) is a no-op.
    return { reminder, changed: false };
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.reminder.update({ where: { id: reminderId }, data: data(reminder) });
    await audit({ userId, actor, action, entityType: "Reminder", entityId: reminderId, metadata: { invoiceId: reminder.invoiceId } }, tx);
    return { reminder: { ...reminder, ...updated }, changed: true };
  });
}

/** DRAFT -> SCHEDULED/DUE. Called only after the owner approved the assistant's request. */
export async function scheduleReminder(userId: string, reminderId: string, actor: Actor) {
  const draft = await ownedReminder(userId, reminderId);
  if (draft.status === "DRAFT") await loadOpenInvoice(userId, draft.invoiceId); // still worth sending?
  return transition(userId, reminderId, ["DRAFT"], (r) => ({ status: initialReminderStatus(r.scheduledAt) }), "reminder.scheduled", actor);
}

export function markReminderSent(userId: string, reminderId: string) {
  return transition(userId, reminderId, ["SCHEDULED", "DUE"], () => ({ status: "SENT", sentAt: new Date() }), "reminder.sent", "user");
}

export function cancelReminder(userId: string, reminderId: string) {
  return transition(userId, reminderId, ["DRAFT", "SCHEDULED", "DUE"], () => ({ status: "CANCELLED" }), "reminder.cancelled", "user");
}

/** Open reminders past their time, across all of a user's invoices (for the dashboard). */
export async function listDueReminders(userId: string, now = new Date()) {
  return db.reminder.findMany({
    where: {
      invoice: { userId },
      OR: [{ status: "DUE" }, { status: "SCHEDULED", scheduledAt: { lte: now } }],
    },
    include: { invoice: { select: { id: true, invoiceNumber: true, client: { select: { name: true } } } } },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });
}

/** Cancel open reminders when an invoice stops needing them (paid or cancelled). */
export async function cancelOpenReminders(tx: Prisma.TransactionClient, invoiceId: string) {
  await tx.reminder.updateMany({
    where: { invoiceId, status: { in: ["DRAFT", "SCHEDULED", "DUE"] } },
    data: { status: "CANCELLED" },
  });
}

/**
 * Periodic sweep (cron). Persists what the UI already derives:
 * - PENDING invoices past their due date become OVERDUE.
 * - SCHEDULED reminders whose time has come become DUE, or CANCELLED if the invoice no longer needs one.
 */
export async function runReminderSweep(now = new Date()) {
  return db.$transaction(async (tx) => {
    const overdue = await tx.invoice.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      select: { id: true, userId: true, invoiceNumber: true },
    });
    if (overdue.length) {
      await tx.invoice.updateMany({ where: { id: { in: overdue.map((i) => i.id) }, status: "PENDING" }, data: { status: "OVERDUE" } });
      await tx.auditLog.createMany({
        data: overdue.map((i) => ({
          userId: i.userId,
          actor: "cron",
          action: "invoice.overdue",
          entityType: "Invoice",
          entityId: i.id,
          metadata: { invoiceNumber: i.invoiceNumber },
        })),
      });
    }

    const stale = await tx.reminder.updateMany({
      where: { status: { in: ["SCHEDULED", "DUE"] }, invoice: { status: { in: ["PAID", "CANCELLED"] } } },
      data: { status: "CANCELLED" },
    });
    const due = await tx.reminder.updateMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: now } },
      data: { status: "DUE" },
    });

    return { invoicesMarkedOverdue: overdue.length, remindersDue: due.count, remindersCancelled: stale.count };
  });
}
