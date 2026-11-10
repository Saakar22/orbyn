import { describe, expect, it } from "vitest";
import {
  composeReminder,
  initialReminderStatus,
  mailtoHref,
  REMINDER_TONES,
  reminderDisplayStatus,
  reminderSubject,
} from "@/lib/reminders";

const ctx = {
  clientName: "Alex Rivera",
  invoiceNumber: "INV-0007",
  balance: "$300.00",
  dueDate: "Nov 24, 2026",
  isOverdue: false,
  payUrl: "https://orbyn.test/pay/abc",
  senderName: "Maya Chen Studio",
};

describe("composeReminder", () => {
  it("includes the essentials in every tone", () => {
    for (const tone of REMINDER_TONES) {
      const text = composeReminder(tone, ctx);
      expect(text).toContain("Hi Alex,");
      expect(text).toContain("INV-0007");
      expect(text).toContain("$300.00");
      expect(text).toContain("https://orbyn.test/pay/abc");
      expect(text).toContain("Maya Chen Studio");
    }
  });

  it("uses past tense once the invoice is overdue", () => {
    expect(composeReminder("polite", ctx)).toContain("is due on Nov 24, 2026");
    expect(composeReminder("firm", { ...ctx, isOverdue: true })).toContain("was due on Nov 24, 2026");
  });

  it("marks final reminders in the subject", () => {
    expect(reminderSubject("INV-0007", "final")).toMatch(/^Final reminder/);
    expect(reminderSubject("INV-0007", "polite")).toMatch(/^Payment reminder/);
  });
});

describe("reminder status", () => {
  const now = new Date("2026-11-11T10:00:00Z");

  it("treats a scheduled reminder whose time has passed as due", () => {
    expect(reminderDisplayStatus({ status: "SCHEDULED", scheduledAt: "2026-11-11T09:00:00Z" }, now)).toBe("DUE");
    expect(reminderDisplayStatus({ status: "SCHEDULED", scheduledAt: "2026-11-12T09:00:00Z" }, now)).toBe("SCHEDULED");
    expect(reminderDisplayStatus({ status: "SENT", scheduledAt: "2026-11-01T09:00:00Z" }, now)).toBe("SENT");
    expect(reminderDisplayStatus({ status: "DRAFT", scheduledAt: "2026-11-01T09:00:00Z" }, now)).toBe("DRAFT");
  });

  it("starts approved reminders as due when their time is now or past", () => {
    expect(initialReminderStatus(now, now)).toBe("DUE");
    expect(initialReminderStatus(new Date("2026-11-20T09:00:00Z"), now)).toBe("SCHEDULED");
  });
});

describe("mailtoHref", () => {
  it("encodes subject and body so line breaks and symbols survive", () => {
    const href = mailtoHref("alex@example.com", "Payment reminder: INV-0007", "Hi Alex,\n\nPay here: https://x.test/pay/a?b=1&c=2");
    expect(href.startsWith("mailto:alex%40example.com?subject=")).toBe(true);
    expect(href).toContain("%0A%0A");
    expect(href).toContain("%26c%3D2");
    expect(href).not.toContain("+");
  });
});
