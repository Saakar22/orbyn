import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { hashPassword, verifyAgainstDecoy, verifyPassword } from "@/server/auth/password";
import { seedDemoWorkspace } from "@/server/seed/demoWorkspace";
import { audit } from "@/server/services/audit";

export const RESET_TOKEN_MINUTES = 30;

export class AccountError extends Error {
  constructor(
    public code: "email_taken" | "invalid_token" | "wrong_password" | "not_allowed",
    message: string,
  ) {
    super(message);
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type NewAccount = { name: string; email: string; password: string; businessName?: string };

function workspaceName(account: Pick<NewAccount, "name" | "businessName">) {
  return account.businessName?.trim() || `${account.name.trim().split(/\s+/)[0]}'s business`;
}

/**
 * Create an account with an empty workspace. With `keepGuestId`, the guest who is signed in to a
 * demo workspace becomes the account instead, so the demo data carries over.
 */
export async function registerAccount(account: NewAccount, options: { keepGuestId?: string } = {}) {
  const email = normalizeEmail(account.email);
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AccountError("email_taken", "An account with this email already exists. Log in instead.");
  }
  const passwordHash = await hashPassword(account.password);

  try {
    if (options.keepGuestId) {
      const guest = await db.user.findFirst({ where: { id: options.keepGuestId, isGuest: true }, include: { workspace: true } });
      if (guest?.workspace) {
        return await db.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: guest.id },
            data: { name: account.name.trim(), email, passwordHash, isGuest: false, onboardedAt: guest.onboardedAt ?? new Date() },
          });
          await tx.workspace.update({ where: { id: guest.workspace!.id }, data: { name: workspaceName(account), isDemo: false } });
          // The guest's browser sessions end here; the caller signs in again with the new credentials.
          await tx.session.deleteMany({ where: { userId: guest.id } });
          await audit({ workspaceId: guest.workspace!.id, userId: user.id, actor: "user", action: "account.created_from_demo", entityType: "User", entityId: user.id }, tx);
          return { user, keptDemo: true };
        });
      }
    }

    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: account.name.trim(), email, passwordHash, workspace: { create: { name: workspaceName(account) } } },
        include: { workspace: true },
      });
      await audit({ workspaceId: user.workspace!.id, userId: user.id, actor: "user", action: "account.created", entityType: "User", entityId: user.id }, tx);
      return { user, keptDemo: false };
    });
  } catch (error) {
    // Two sign-ups racing for the same email: the unique index decides.
    if ((error as { code?: string }).code === "P2002") {
      throw new AccountError("email_taken", "An account with this email already exists. Log in instead.");
    }
    throw error;
  }
}

/** Check an email and password. Returns the user or null; never says which part was wrong. */
export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || user.isGuest || !user.passwordHash) {
    await verifyAgainstDecoy(password);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

/** Find or create the account for a verified Google profile. */
export async function accountForGoogle(profile: { sub: string; email: string; name?: string | null }) {
  const email = normalizeEmail(profile.email);
  const linked = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (linked) return linked;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return db.user.update({ where: { id: existing.id }, data: { googleId: profile.sub } });

  const name = profile.name?.trim() || email.split("@")[0];
  return db.user.create({
    data: { name, email, googleId: profile.sub, workspace: { create: { name: workspaceName({ name }) } } },
  });
}

/**
 * Start a password reset. Always resolves the same way whether or not the account exists.
 * Returns the link only so the caller can deliver it (or log it in development).
 */
export async function createPasswordReset(emailInput: string, baseUrl: string) {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(emailInput) } });
  if (!user || user.isGuest) return null;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000) },
    }),
  ]);
  return { email: user.email, link: `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}` };
}

export async function isResetTokenValid(token: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(row && !row.usedAt && row.expiresAt > new Date());
}

/** Spend a reset token and set the new password. The token works once; every browser is signed out. */
export async function resetPassword(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const now = new Date();
    // Claiming the token and checking it are one statement, so two requests can't both win.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new AccountError("invalid_token", "This reset link has expired or was already used. Request a new one.");
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: row.userId } });
    await audit({ userId: row.userId, actor: "user", action: "account.password_reset", entityType: "User", entityId: row.userId }, tx);
    return row.userId;
  });
}

export async function changePassword(userId: string, current: string, next: string, keepSessionId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.isGuest) throw new AccountError("not_allowed", "Create an account first to set a password.");
  // Accounts created with Google have no password yet, so there is nothing to confirm.
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) {
    throw new AccountError("wrong_password", "Your current password is incorrect.");
  }
  const passwordHash = await hashPassword(next);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
    await audit({ userId, actor: "user", action: "account.password_changed", entityType: "User", entityId: userId }, tx);
  });
}

export function listSessions(userId: string) {
  return db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true },
  });
}

export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  const { count } = await db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
  return count;
}

/** Remove every business record in a workspace, children first (invoices hold a restricting link to clients). */
async function clearWorkspace(tx: Prisma.TransactionClient, workspaceId: string) {
  await tx.transaction.deleteMany({ where: { workspaceId } });
  await tx.invoice.deleteMany({ where: { workspaceId } });
  await tx.client.deleteMany({ where: { workspaceId } });
  await tx.agentConversation.deleteMany({ where: { workspaceId } });
}

/** Wipe the workspace and load the sample data again. */
export async function resetDemoData(workspaceId: string, userId: string) {
  await db.$transaction((tx) => clearWorkspace(tx, workspaceId), { timeout: 30_000 });
  await seedDemoWorkspace(db, workspaceId);
  await audit({ workspaceId, userId, actor: "user", action: "workspace.reset", entityType: "Workspace", entityId: workspaceId });
}

/** Delete the account, its workspace and everything in it. */
export async function deleteAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { workspace: true } });
  await db.$transaction(
    async (tx) => {
      if (user.workspace) await clearWorkspace(tx, user.workspace.id);
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 30_000 },
  );
}
