// Database-backed tests for accounts and workspace isolation. They run against the Postgres in
// DATABASE_URL and clean up every account they create. Skipped when no database is configured.
import { afterAll, describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth-schemas";
import {
  AccountError,
  changePassword,
  createPasswordReset,
  deleteAccount,
  isResetTokenValid,
  listSessions,
  registerAccount,
  resetPassword,
  revokeOtherSessions,
  verifyCredentials,
} from "@/server/auth/accounts";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { clearRateLimit, rateLimit } from "@/server/auth/rate-limit";
import { db } from "@/server/db";
import { createDemoUser } from "@/server/seed/demoWorkspace";
import { getRecentTransactions } from "@/server/services/analytics";
import { buildInvoiceDraft, getInvoice, issueInvoice, listInvoices, saveInvoiceDraft, setInvoiceStatus } from "@/server/services/invoices";
import { RefundError, refundPayment } from "@/server/services/refunds";
import { createReminder, ReminderError } from "@/server/services/reminders";

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const address = (label: string) => `test+${label}-${run}@orbyn.test`;
const PASSWORD = "Orbit-plan-2026";
const created: string[] = [];

async function account(label: string, businessName?: string) {
  const { user } = await registerAccount({ name: `${label} Tester`, email: address(label), password: PASSWORD, businessName });
  created.push(user.id);
  const workspace = await db.workspace.findUniqueOrThrow({ where: { ownerId: user.id } });
  return { user, workspace };
}

async function invoiceFor(workspaceId: string, clientName: string) {
  const draft = await buildInvoiceDraft(workspaceId, {
    clientName,
    currency: "USD",
    taxRatePercent: 0,
    items: [{ description: "Design work", quantity: 1, unitPrice: 500 }],
  });
  return saveInvoiceDraft(workspaceId, draft, "user");
}

const expectsDatabase = Boolean(process.env.DATABASE_URL);

afterAll(async () => {
  if (!expectsDatabase) return;
  for (const id of created) await deleteAccount(id).catch(() => undefined);
  await db.rateLimit.deleteMany({ where: { key: { contains: run } } });
  await db.$disconnect();
});

describe("password hashing", () => {
  it("stores argon2id hashes and verifies only the right password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword(`${PASSWORD}x`, hash)).toBe(false);
    expect(await verifyPassword(PASSWORD, null)).toBe(false);
    expect(await hashPassword(PASSWORD)).not.toBe(hash); // fresh salt every time
  });
});

describe("post-login destination", () => {
  it("only allows paths on this site", () => {
    expect(safeNextPath("/invoices?status=PAID")).toBe("/invoices?status=PAID");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });
});

describe.skipIf(!expectsDatabase)("accounts", () => {
  it("signs up with an empty workspace, and refuses a second account with the same email", async () => {
    const { user, workspace } = await account("signup", "Signup Studio");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.isGuest).toBe(false);
    expect(workspace.name).toBe("Signup Studio");
    expect(await db.invoice.count({ where: { workspaceId: workspace.id } })).toBe(0);

    const again = registerAccount({ name: "Someone Else", email: address("signup").toUpperCase(), password: PASSWORD });
    await expect(again).rejects.toMatchObject({ code: "email_taken" });
  });

  it("logs in with the right password and gives nothing away for a wrong one or an unknown email", async () => {
    const { user } = await account("login");
    expect((await verifyCredentials(address("login"), PASSWORD))?.id).toBe(user.id);
    expect((await verifyCredentials(`  ${address("login").toUpperCase()} `, PASSWORD))?.id).toBe(user.id);
    expect(await verifyCredentials(address("login"), "Wrong-password-1")).toBeNull();
    expect(await verifyCredentials(address("nobody"), PASSWORD)).toBeNull();
  });

  it("never lets a demo guest log in with a password", async () => {
    const guest = await createDemoUser(db);
    created.push(guest.id);
    expect(await verifyCredentials(guest.email, PASSWORD)).toBeNull();
    expect(await createPasswordReset(guest.email, "http://localhost:3000")).toBeNull();
  });

  it("resets a password with a single-use, hashed, expiring token and signs every browser out", async () => {
    const { user } = await account("reset");
    const session = await db.session.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } });

    expect(await createPasswordReset(address("nobody"), "http://localhost:3000")).toBeNull();
    const reset = await createPasswordReset(address("reset"), "http://localhost:3000/");
    const token = new URL(reset!.link).searchParams.get("token")!;
    expect(reset!.link.startsWith("http://localhost:3000/reset-password?token=")).toBe(true);

    const row = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const minutes = (row.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);

    expect(await isResetTokenValid(token)).toBe(true);
    await resetPassword(token, "New-orbit-2027");
    expect(await verifyCredentials(address("reset"), PASSWORD)).toBeNull();
    expect((await verifyCredentials(address("reset"), "New-orbit-2027"))?.id).toBe(user.id);
    expect(await db.session.findUnique({ where: { id: session.id } })).toBeNull();

    // Used once: the same link is dead.
    expect(await isResetTokenValid(token)).toBe(false);
    await expect(resetPassword(token, "Another-orbit-2028")).rejects.toBeInstanceOf(AccountError);
  });

  it("refuses an expired reset token", async () => {
    const { user } = await account("expired");
    const reset = await createPasswordReset(address("expired"), "http://localhost:3000");
    const token = new URL(reset!.link).searchParams.get("token")!;
    await db.passwordResetToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await isResetTokenValid(token)).toBe(false);
    await expect(resetPassword(token, "New-orbit-2027")).rejects.toMatchObject({ code: "invalid_token" });
    expect((await verifyCredentials(address("expired"), PASSWORD))?.id).toBe(user.id);
  });

  it("changes a password only with the current one, and signs out other sessions", async () => {
    const { user } = await account("change");
    const expiresAt = new Date(Date.now() + 86_400_000);
    const here = await db.session.create({ data: { userId: user.id, expiresAt } });
    await db.session.create({ data: { userId: user.id, expiresAt } });

    await expect(changePassword(user.id, "Wrong-password-1", "New-orbit-2027", here.id)).rejects.toMatchObject({ code: "wrong_password" });
    await changePassword(user.id, PASSWORD, "New-orbit-2027", here.id);
    expect((await listSessions(user.id)).map((s) => s.id)).toEqual([here.id]);
    expect((await verifyCredentials(address("change"), "New-orbit-2027"))?.id).toBe(user.id);
  });

  it("signs out other sessions on request and keeps the current one", async () => {
    const { user } = await account("sessions");
    const expiresAt = new Date(Date.now() + 86_400_000);
    const here = await db.session.create({ data: { userId: user.id, expiresAt } });
    await db.session.createMany({ data: [{ userId: user.id, expiresAt }, { userId: user.id, expiresAt }] });
    expect(await revokeOtherSessions(user.id, here.id)).toBe(2);
    expect((await listSessions(user.id)).map((s) => s.id)).toEqual([here.id]);
  });

  it("turns a demo guest into an account that keeps the demo workspace", async () => {
    const guest = await createDemoUser(db);
    created.push(guest.id);
    const workspaceId = guest.workspace!.id;
    const invoicesBefore = await db.invoice.count({ where: { workspaceId } });
    expect(invoicesBefore).toBeGreaterThan(0);
    await db.session.create({ data: { userId: guest.id, expiresAt: new Date(Date.now() + 86_400_000) } });

    const { user, keptDemo } = await registerAccount(
      { name: "Kept Demo", email: address("keep"), password: PASSWORD, businessName: "Kept Studio" },
      { keepGuestId: guest.id },
    );
    expect(keptDemo).toBe(true);
    expect(user.id).toBe(guest.id);
    expect(user.isGuest).toBe(false);
    const workspace = await db.workspace.findUniqueOrThrow({ where: { ownerId: user.id } });
    expect(workspace.id).toBe(workspaceId);
    expect(workspace).toMatchObject({ name: "Kept Studio", isDemo: false });
    expect(await db.invoice.count({ where: { workspaceId } })).toBe(invoicesBefore);
    expect(await db.session.count({ where: { userId: guest.id } })).toBe(0); // the guest session ends
    expect((await verifyCredentials(address("keep"), PASSWORD))?.id).toBe(user.id);
  });

  it("starts fresh when asked, leaving the demo workspace untouched, and can't take over a real account", async () => {
    const guest = await createDemoUser(db);
    created.push(guest.id);
    const { user, keptDemo } = await registerAccount({ name: "Fresh Start", email: address("fresh"), password: PASSWORD });
    created.push(user.id);
    expect(keptDemo).toBe(false);
    expect(user.id).not.toBe(guest.id);
    expect(await db.invoice.count({ where: { workspace: { ownerId: user.id } } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: guest.id } })).isGuest).toBe(true);

    // keepGuestId pointing at a real account is ignored: a new, separate account is created.
    const other = await registerAccount({ name: "Not A Takeover", email: address("takeover"), password: PASSWORD }, { keepGuestId: user.id });
    created.push(other.user.id);
    expect(other.keptDemo).toBe(false);
    expect(other.user.id).not.toBe(user.id);
    expect((await verifyCredentials(address("fresh"), PASSWORD))?.id).toBe(user.id);
  });

  it("deletes an account together with its workspace data", async () => {
    const { user, workspace } = await account("delete");
    await invoiceFor(workspace.id, "Doomed Client");
    await deleteAccount(user.id);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.invoice.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect(await db.client.count({ where: { workspaceId: workspace.id } })).toBe(0);
  });
});

describe.skipIf(!expectsDatabase)("workspace isolation", () => {
  it("user A cannot read, list, change, remind on or refund user B's records", async () => {
    const a = await account("iso-a");
    const b = await account("iso-b");
    const mine = await invoiceFor(a.workspace.id, "Shared Name Ltd");
    const theirs = await invoiceFor(b.workspace.id, "Shared Name Ltd");
    await issueInvoice(b.workspace.id, theirs.id, "user");
    const theirPayment = await db.transaction.create({
      data: { workspaceId: b.workspace.id, invoiceId: theirs.id, amountMinor: 50_000, currency: "USD", status: "COMPLETED", source: "SEEDED" },
    });

    // Reading by id or by number only ever finds your own.
    expect((await getInvoice(a.workspace.id, { id: mine.id }))?.id).toBe(mine.id);
    expect(await getInvoice(a.workspace.id, { id: theirs.id })).toBeNull();
    // Both workspaces have an INV-0001; the number resolves inside the caller's workspace only.
    expect(theirs.invoiceNumber).toBe(mine.invoiceNumber);
    expect((await getInvoice(a.workspace.id, { invoiceNumber: theirs.invoiceNumber }))?.id).toBe(mine.id);

    // Lists.
    expect((await listInvoices(a.workspace.id)).map((i) => i.id)).toEqual([mine.id]);
    expect(await getRecentTransactions(a.workspace.id)).toHaveLength(0);
    expect((await getRecentTransactions(b.workspace.id)).map((t) => t.id)).toEqual([theirPayment.id]);

    // Writes against someone else's ids fail and change nothing.
    await expect(setInvoiceStatus(a.workspace.id, theirs.id, "CANCELLED", "user")).rejects.toThrow();
    await expect(issueInvoice(a.workspace.id, theirs.id, "user")).rejects.toThrow();
    await expect(
      createReminder(a.workspace.id, { invoiceId: theirs.id, tone: "polite", message: "Pay up", scheduledAt: new Date() }, "user"),
    ).rejects.toBeInstanceOf(ReminderError);
    await expect(refundPayment(a.workspace.id, theirPayment.id, 1_000)).rejects.toBeInstanceOf(RefundError);

    const untouched = await db.invoice.findUniqueOrThrow({ where: { id: theirs.id } });
    expect(untouched.status).toBe("PENDING");
    expect(await db.reminder.count({ where: { invoiceId: theirs.id } })).toBe(0);
    expect((await db.transaction.findUniqueOrThrow({ where: { id: theirPayment.id } })).refundedMinor).toBe(0);

    // Clients with the same name stay separate.
    expect(mine.clientId).not.toBe(theirs.clientId);
  });
});

describe.skipIf(!expectsDatabase)("rate limiting", () => {
  it("allows up to the limit inside a window, then blocks until it is cleared", async () => {
    const key = `test:${run}`;
    for (let attempt = 1; attempt <= 3; attempt++) expect((await rateLimit(key, 3, 60)).ok).toBe(true);
    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    await clearRateLimit(key);
    expect((await rateLimit(key, 3, 60)).ok).toBe(true);
  });

  it("starts a new window once the old one has passed", async () => {
    const key = `test-window:${run}`;
    await rateLimit(key, 1, 60);
    expect((await rateLimit(key, 1, 60)).ok).toBe(false);
    await db.rateLimit.update({ where: { key }, data: { resetAt: new Date(Date.now() - 1000) } });
    expect((await rateLimit(key, 1, 60)).ok).toBe(true);
  });
});
