// Pure reminder helpers shared by server, assistant and UI.

export const REMINDER_TONES = ["polite", "firm", "final"] as const;
export type ReminderTone = (typeof REMINDER_TONES)[number];

export const TONE_LABELS: Record<ReminderTone, string> = {
  polite: "Friendly",
  firm: "Firm",
  final: "Final notice",
};

export type ReminderContext = {
  clientName: string;
  invoiceNumber: string;
  balance: string; // already formatted, e.g. "$300.00"
  dueDate: string; // already formatted, e.g. "Nov 24, 2026"
  isOverdue: boolean;
  payUrl: string;
  senderName: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** Default reminder text for a tone. The user (or the assistant) can edit it before it is scheduled. */
export function composeReminder(tone: ReminderTone, ctx: ReminderContext): string {
  const hello = `Hi ${firstName(ctx.clientName)},`;
  const due = ctx.isOverdue ? `was due on ${ctx.dueDate}` : `is due on ${ctx.dueDate}`;
  const link = `You can pay securely here: ${ctx.payUrl}`;
  const sign = `Thanks,\n${ctx.senderName}`;

  switch (tone) {
    case "polite":
      return `${hello}\n\nA quick reminder that invoice ${ctx.invoiceNumber} for ${ctx.balance} ${due}. ${link}\n\nIf you've already sent it, please ignore this note.\n\n${sign}`;
    case "firm":
      return `${hello}\n\nInvoice ${ctx.invoiceNumber} for ${ctx.balance} ${due} and is still outstanding. Please arrange payment as soon as possible. ${link}\n\nLet me know if there's anything holding this up.\n\n${sign}`;
    case "final":
      return `${hello}\n\nThis is a final reminder that invoice ${ctx.invoiceNumber} for ${ctx.balance} ${due} and remains unpaid. Please settle it within 7 days. ${link}\n\nIf there's a problem with the invoice, reply to this email so we can resolve it.\n\n${sign}`;
  }
}

export function reminderSubject(invoiceNumber: string, tone: string) {
  if (tone === "final") return `Final reminder: invoice ${invoiceNumber}`;
  return `Payment reminder: invoice ${invoiceNumber}`;
}

/** A SCHEDULED reminder whose time has come is DUE, even before the cron job persists it. */
export function reminderDisplayStatus(reminder: { status: string; scheduledAt: Date | string }, now = new Date()): string {
  if (reminder.status === "SCHEDULED" && new Date(reminder.scheduledAt).getTime() <= now.getTime()) return "DUE";
  return reminder.status;
}

/** Status a newly approved reminder starts in. */
export function initialReminderStatus(scheduledAt: Date, now = new Date()): "SCHEDULED" | "DUE" {
  return scheduledAt.getTime() <= now.getTime() ? "DUE" : "SCHEDULED";
}

export function mailtoHref(to: string | null | undefined, subject: string, body: string) {
  // encodeURIComponent, not URLSearchParams: mail clients expect %20, not "+".
  return `mailto:${encodeURIComponent(to ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
