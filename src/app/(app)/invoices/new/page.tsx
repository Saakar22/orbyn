import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
import { PageContainer, PageHeader } from "@/components/page-header";
import { dateInputFromToday } from "@/lib/format";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "New invoice" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function NewInvoicePage() {
  const { workspace } = await requireWorkspace();
  const clients = await db.client.findMany({
    where: { workspaceId: workspace.id },
    select: { name: true, email: true, company: true },
    orderBy: { name: "asc" },
  });
  const due = dateInputFromToday(14);

  return (
    <PageContainer>
      <PageHeader title="New invoice" description="Or ask the assistant: “Invoice Alex $500 for website development.”" />
      <NewInvoiceForm clients={clients} defaultDueDate={due} />
    </PageContainer>
  );
}
