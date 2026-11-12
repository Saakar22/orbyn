-- Workspaces and sign-in. Each existing user (all of them demo visitors) becomes a guest who owns
-- a demo workspace with the same id, so every business row keeps its key and only the column is renamed.

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Workspace" ("id", "ownerId", "name", "currency", "isDemo", "createdAt")
SELECT "id", "id", COALESCE("businessName", "name"), "defaultCurrency", true, "createdAt" FROM "User";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "businessName",
DROP COLUMN "defaultCurrency",
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "tourDismissedAt" TIMESTAMP(3);

UPDATE "User" SET "isGuest" = true, "onboardedAt" = "createdAt", "tourDismissedAt" = "createdAt";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- Re-point business rows from the user to the workspace.

ALTER TABLE "Client" DROP CONSTRAINT "Client_userId_fkey";
ALTER TABLE "Client" RENAME COLUMN "userId" TO "workspaceId";
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Invoice" RENAME COLUMN "userId" TO "workspaceId";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";
ALTER TABLE "Transaction" RENAME COLUMN "userId" TO "workspaceId";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentConversation" DROP CONSTRAINT "AgentConversation_userId_fkey";
ALTER TABLE "AgentConversation" RENAME COLUMN "userId" TO "workspaceId";
ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER INDEX "Client_userId_idx" RENAME TO "Client_workspaceId_idx";
ALTER INDEX "Client_userId_name_key" RENAME TO "Client_workspaceId_name_key";
ALTER INDEX "Invoice_userId_status_idx" RENAME TO "Invoice_workspaceId_status_idx";
ALTER INDEX "Invoice_userId_dueDate_idx" RENAME TO "Invoice_workspaceId_dueDate_idx";
ALTER INDEX "Invoice_userId_invoiceNumber_key" RENAME TO "Invoice_workspaceId_invoiceNumber_key";
ALTER INDEX "Transaction_userId_createdAt_idx" RENAME TO "Transaction_workspaceId_createdAt_idx";
ALTER INDEX "AgentConversation_userId_updatedAt_idx" RENAME TO "AgentConversation_workspaceId_updatedAt_idx";

-- Audit entries are scoped to a workspace; userId now records the signed-in person when there was one.
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
DROP INDEX "AuditLog_userId_createdAt_idx";
ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT;
UPDATE "AuditLog" SET "workspaceId" = "userId";
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "Workspace_ownerId_key" ON "Workspace"("ownerId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
