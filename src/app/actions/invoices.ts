"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildInvoiceDraft, createInvoiceInput, saveInvoiceDraft, setInvoiceStatus } from "@/server/services/invoices";
import { requireUserId } from "@/server/session";

export type CreateInvoiceState = { error?: string } | undefined;

export async function createInvoiceAction(_prev: CreateInvoiceState, formData: FormData): Promise<CreateInvoiceState> {
  const userId = await requireUserId();
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Line items are invalid." };
  }

  const parsed = createInvoiceInput.safeParse({
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail") || undefined,
    clientCompany: formData.get("clientCompany") || undefined,
    description: formData.get("description") || undefined,
    currency: formData.get("currency") || "USD",
    taxRatePercent: Number(formData.get("taxRatePercent") || 0),
    dueDate: formData.get("dueDate") || undefined,
    items,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "Invoice"}: ${issue.message}` };
  }

  const draft = await buildInvoiceDraft(userId, parsed.data);
  const invoice = await saveInvoiceDraft(userId, draft, "user");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function cancelInvoiceAction(invoiceId: string) {
  const userId = await requireUserId();
  await setInvoiceStatus(userId, invoiceId, "CANCELLED", "user");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
