import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type Actor = "user" | "agent" | "paypal_webhook" | "cron" | "system";

type AuditInput = {
  workspaceId?: string | null;
  /** The signed-in person, when the action was theirs. */
  userId?: string | null;
  actor: Actor;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
};

/** Append an audit entry. Pass a transaction client to log atomically with the change. */
export async function audit(entry: AuditInput, tx: Prisma.TransactionClient = db) {
  await tx.auditLog.create({ data: { ...entry, workspaceId: entry.workspaceId ?? null, userId: entry.userId ?? null } });
}
