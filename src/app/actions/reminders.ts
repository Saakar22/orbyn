"use server";

import { revalidatePath } from "next/cache";
import { REMINDER_TONES } from "@/lib/reminders";
import { cancelReminder, createReminder, markReminderSent, ReminderError } from "@/server/services/reminders";
import { requireUserId } from "@/server/session";

export type ReminderFormState = { error?: string; ok?: boolean } | undefined;

export async function createReminderAction(invoiceId: string, _prev: ReminderFormState, formData: FormData): Promise<ReminderFormState> {
  const userId = await requireUserId();
  const tone = String(formData.get("tone") ?? "polite");
  const date = String(formData.get("sendOn") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!(REMINDER_TONES as readonly string[]).includes(tone)) return { error: "Pick a tone." };
  if (!message) return { error: "The message can't be empty." };
  // A date-only value means "that day": schedule at 09:00 local server time, or now if that's in the past.
  let scheduledAt = new Date();
  if (date) {
    const parsed = new Date(`${date}T09:00:00`);
    if (Number.isNaN(parsed.getTime())) return { error: "That date isn't valid." };
    if (parsed > scheduledAt) scheduledAt = parsed;
  }

  try {
    await createReminder(userId, { invoiceId, tone: tone as (typeof REMINDER_TONES)[number], message, scheduledAt }, "user");
  } catch (error) {
    if (error instanceof ReminderError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markReminderSentAction(reminderId: string, invoiceId: string) {
  const userId = await requireUserId();
  await markReminderSent(userId, reminderId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function cancelReminderAction(reminderId: string, invoiceId: string) {
  const userId = await requireUserId();
  await cancelReminder(userId, reminderId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}
