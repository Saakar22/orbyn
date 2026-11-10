import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
import { PageContainer, PageHeader } from "@/components/page-header";
import { dateInputFromToday } from "@/lib/format";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const user = await requireUser();
  const clients = await db.client.findMany({
    where: { userId: user.id },
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
