// Seeds a demo workspace. Every record is tagged source=SEEDED so the UI can label it,
// and seeded transactions never carry a PayPal capture ID.
import { randomBytes } from "node:crypto";
import type { InvoiceStatus, PrismaClient } from "@/generated/prisma/client";
import { computeTotals } from "@/lib/money";

const DAY_MS = 86_400_000;

const CLIENTS = [
  { name: "Alex Rivera", email: "alex@riveralabs.io", company: "Rivera Labs" },
  { name: "Rahul Mehta", email: "rahul@mehta.design", company: "Mehta Design Co." },
  { name: "Priya Shah", email: "priya@lumenhealth.com", company: "Lumen Health" },
  { name: "Jordan Lee", email: "jordan@northwind.co", company: "Northwind Co." },
  { name: "Sofia Garcia", email: "sofia@garciaandco.com", company: "Garcia & Co." },
  { name: "Kenji Tanaka", email: "kenji@tanaka.studio", company: "Tanaka Studio" },
  { name: "Emma Wilson", email: "emma@brightpath.org", company: "BrightPath" },
];

const SERVICES = [
  { description: "Website development", unit: 50000 },
  { description: "UI design sprint", unit: 120000 },
  { description: "Landing page redesign", unit: 85000 },
  { description: "Brand identity package", unit: 150000 },
  { description: "Monthly maintenance retainer", unit: 40000 },
  { description: "Mobile app prototype", unit: 210000 },
  { description: "SEO audit", unit: 30000 },
  { description: "Consulting hours", unit: 9000 },
];

type SeedInvoice = {
  client: number;
  service: number;
  quantity: number;
  issuedDaysAgo: number;
  termDays: number;
  status: InvoiceStatus;
  paidAfterDays?: number;
};

// Days are relative to "now" so the dashboard always looks current.
// Paid history spans ~6 months so the revenue chart and month-over-month comparison have real data.
const INVOICES: SeedInvoice[] = [
  { client: 3, service: 1, quantity: 1, issuedDaysAgo: 182, termDays: 14, status: "PAID", paidAfterDays: 9 },
  { client: 1, service: 3, quantity: 1, issuedDaysAgo: 170, termDays: 30, status: "PAID", paidAfterDays: 21 },
  { client: 5, service: 4, quantity: 3, issuedDaysAgo: 160, termDays: 14, status: "PAID", paidAfterDays: 5 },
  { client: 0, service: 0, quantity: 1, issuedDaysAgo: 150, termDays: 14, status: "PAID", paidAfterDays: 12 },
  { client: 2, service: 5, quantity: 1, issuedDaysAgo: 138, termDays: 30, status: "PAID", paidAfterDays: 28 },
  { client: 6, service: 6, quantity: 2, issuedDaysAgo: 125, termDays: 14, status: "PAID", paidAfterDays: 3 },
  { client: 4, service: 2, quantity: 1, issuedDaysAgo: 118, termDays: 14, status: "PAID", paidAfterDays: 10 },
  { client: 3, service: 7, quantity: 12, issuedDaysAgo: 104, termDays: 14, status: "PAID", paidAfterDays: 7 },
  { client: 1, service: 1, quantity: 1, issuedDaysAgo: 95, termDays: 30, status: "PAID", paidAfterDays: 18 },
  { client: 5, service: 4, quantity: 3, issuedDaysAgo: 88, termDays: 14, status: "PAID", paidAfterDays: 4 },
  { client: 2, service: 2, quantity: 1, issuedDaysAgo: 76, termDays: 14, status: "PAID", paidAfterDays: 13 },
  { client: 0, service: 3, quantity: 1, issuedDaysAgo: 66, termDays: 30, status: "PAID", paidAfterDays: 25 },
  { client: 6, service: 7, quantity: 20, issuedDaysAgo: 58, termDays: 14, status: "PAID", paidAfterDays: 6 },
  { client: 4, service: 5, quantity: 1, issuedDaysAgo: 49, termDays: 30, status: "PAID", paidAfterDays: 20 },
  { client: 3, service: 4, quantity: 3, issuedDaysAgo: 41, termDays: 14, status: "PAID", paidAfterDays: 8 },
  { client: 1, service: 6, quantity: 1, issuedDaysAgo: 34, termDays: 14, status: "PAID", paidAfterDays: 11 },
  { client: 5, service: 0, quantity: 1, issuedDaysAgo: 22, termDays: 14, status: "PAID", paidAfterDays: 9 },
  { client: 2, service: 7, quantity: 8, issuedDaysAgo: 15, termDays: 7, status: "PAID", paidAfterDays: 4 },
  { client: 6, service: 2, quantity: 1, issuedDaysAgo: 9, termDays: 14, status: "PAID", paidAfterDays: 2 },
  // Overdue (PENDING with a past due date)
  { client: 2, service: 1, quantity: 1, issuedDaysAgo: 32, termDays: 14, status: "PENDING" },
  { client: 4, service: 3, quantity: 1, issuedDaysAgo: 25, termDays: 14, status: "PENDING" },
  { client: 3, service: 7, quantity: 6, issuedDaysAgo: 18, termDays: 14, status: "PENDING" },
  // Pending, not yet due
  { client: 1, service: 5, quantity: 1, issuedDaysAgo: 6, termDays: 30, status: "PENDING" },
  { client: 5, service: 4, quantity: 3, issuedDaysAgo: 4, termDays: 14, status: "PENDING" },
  { client: 6, service: 6, quantity: 1, issuedDaysAgo: 2, termDays: 14, status: "PENDING" },
  // Draft and cancelled
  { client: 4, service: 2, quantity: 1, issuedDaysAgo: 1, termDays: 14, status: "DRAFT" },
  { client: 1, service: 7, quantity: 4, issuedDaysAgo: 60, termDays: 14, status: "CANCELLED" },
];

/** Spread seeded records across the working day so they don't all share one timestamp. */
function atWorkingHour(time: number, salt: number) {
  const date = new Date(time);
  date.setHours(8 + ((salt * 7) % 10), (salt * 23 + 11) % 60, (salt * 37) % 60, 0);
  return date;
}

function earlier(date: Date, limit: number) {
  return date.getTime() > limit ? new Date(limit - 5 * 60_000) : date;
}

export async function seedDemoWorkspace(db: PrismaClient, workspaceId: string, currency = "USD") {
  const now = Date.now();

  const clients = await Promise.all(
    CLIENTS.map((client) => db.client.create({ data: { ...client, workspaceId, source: "SEEDED" } })),
  );

  // Oldest first so invoice numbers increase with issue date.
  const ordered = [...INVOICES].sort((a, b) => b.issuedDaysAgo - a.issuedDaysAgo);
  for (const [index, seed] of ordered.entries()) {
    const service = SERVICES[seed.service];
    const items = [{ description: service.description, quantity: seed.quantity, unitPriceMinor: service.unit }];
    const totals = computeTotals(items);
    const issueDate = atWorkingHour(now - seed.issuedDaysAgo * DAY_MS, index * 2);
    const paidAt =
      seed.paidAfterDays !== undefined
        ? earlier(atWorkingHour(issueDate.getTime() + seed.paidAfterDays * DAY_MS, index * 2 + 1), now)
        : null;

    await db.invoice.create({
      data: {
        workspaceId,
        clientId: clients[seed.client].id,
        invoiceNumber: `INV-${String(index + 1).padStart(4, "0")}`,
        description: service.description,
        currency,
        subtotalMinor: totals.subtotalMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        amountPaidMinor: paidAt ? totals.totalMinor : 0,
        status: seed.status,
        issueDate,
        dueDate: new Date(issueDate.getTime() + seed.termDays * DAY_MS),
        paidAt,
        publicToken: randomBytes(32).toString("base64url"),
        source: "SEEDED",
        createdAt: issueDate,
        items: {
          create: items.map((item, position) => ({ ...item, totalMinor: totals.lines[position], position })),
        },
        transactions: paidAt
          ? {
              create: {
                workspaceId,
                amountMinor: totals.totalMinor,
                currency,
                status: "COMPLETED",
                source: "SEEDED",
                payerEmail: CLIENTS[seed.client].email,
                createdAt: paidAt,
              },
            }
          : undefined,
      },
    });
  }

  await db.auditLog.create({
    data: { workspaceId, actor: "system", action: "workspace.seeded", entityType: "Workspace", entityId: workspaceId },
  });
}

/** A guest (no password) who owns a seeded demo workspace. Created by "Try the live demo". */
export async function createDemoUser(db: PrismaClient) {
  const now = new Date();
  const user = await db.user.create({
    data: {
      name: "Maya Chen",
      email: `demo+${randomBytes(6).toString("hex")}@orbyn.app`,
      isGuest: true,
      onboardedAt: now,
      workspace: { create: { name: "Chen Studio", isDemo: true } },
    },
    include: { workspace: true },
  });
  await seedDemoWorkspace(db, user.workspace!.id);
  return user;
}
