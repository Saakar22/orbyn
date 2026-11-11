import { describe, expect, it } from "vitest";
import { previewIntent, SAMPLE_PROMPTS } from "@/lib/intent-preview";

describe("previewIntent", () => {
  it("reads the classic invoice instruction", () => {
    expect(previewIntent("Invoice Alex $500 for website development")).toMatchObject({
      action: "invoice",
      client: "Alex",
      amountMinor: 50_000,
      description: "Website development",
      dueInDays: 14,
      dueIsDefault: true,
      missing: [],
    });
  });

  it("handles full names, thousands separators and an explicit due date", () => {
    expect(previewIntent("Bill Priya Nair $1,250 for brand identity, due in 30 days")).toMatchObject({
      action: "invoice",
      client: "Priya Nair",
      amountMinor: 125_000,
      description: "Brand identity",
      dueInDays: 30,
      dueIsDefault: false,
    });
  });

  it("handles 'send X an invoice for N for ...' without a dollar sign", () => {
    expect(previewIntent("Send Jordan an invoice for 320 for two hours of consulting")).toMatchObject({
      action: "invoice",
      client: "Jordan",
      amountMinor: 32_000,
      description: "Two hours of consulting",
    });
  });

  it("accepts lowercase typing and cents", () => {
    expect(previewIntent("invoice alex $99.50 for hosting")).toMatchObject({ client: "Alex", amountMinor: 9_950, description: "Hosting" });
  });

  it("does not mistake durations for amounts", () => {
    expect(previewIntent("Invoice Dana for 3 hours of design").amountMinor).toBeNull();
  });

  it("lists what is missing instead of guessing", () => {
    expect(previewIntent("Create an invoice").missing).toEqual(["Who should this be billed to?", "How much is it for?", "What is it for?"]);
    expect(previewIntent("Invoice Alex $500").missing).toEqual(["What is it for?"]);
  });

  it("reads reminders, including an invoice reference", () => {
    expect(previewIntent("Remind Sam about invoice INV-0007")).toMatchObject({ action: "reminder", client: "Sam", invoiceRef: "INV-0007", missing: [] });
    expect(previewIntent("Send a reminder").missing).toHaveLength(1);
  });

  it("treats questions about money as summaries and gibberish as unknown", () => {
    expect(previewIntent("Which clients have overdue payments?").action).toBe("summary");
    expect(previewIntent("How much revenue this month").action).toBe("summary");
    expect(previewIntent("hello there").action).toBe("unknown");
    expect(previewIntent("   ").action).toBe("unknown");
  });

  it("gives every sample prompt a recognised action", () => {
    for (const prompt of SAMPLE_PROMPTS) expect(previewIntent(prompt).action).not.toBe("unknown");
  });
});
