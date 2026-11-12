import "server-only";
import type { UIMessage } from "ai";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { OrbynUIMessage } from "@/server/agent/tools";

export async function createConversation(workspaceId: string) {
  return db.agentConversation.create({ data: { workspaceId } });
}

export async function listConversations(workspaceId: string, limit = 20) {
  return db.agentConversation.findMany({
    where: { workspaceId, messages: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function getConversation(workspaceId: string, conversationId: string) {
  const conversation = await db.agentConversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: { messages: { orderBy: { position: "asc" } } },
  });
  if (!conversation) return null;
  return {
    ...conversation,
    messages: conversation.messages.map((row) => row.message as unknown as OrbynUIMessage),
  };
}

export async function saveConversation(conversationId: string, messages: UIMessage[]) {
  const firstUserText = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text")
    ?.text.trim();

  await db.$transaction([
    ...messages.map((message, position) =>
      db.agentMessage.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          role: message.role,
          position,
          message: message as unknown as Prisma.InputJsonValue,
        },
        update: { message: message as unknown as Prisma.InputJsonValue, position },
      }),
    ),
    db.agentConversation.update({
      where: { id: conversationId },
      data: firstUserText ? { title: firstUserText.slice(0, 80), updatedAt: new Date() } : { updatedAt: new Date() },
    }),
  ]);
}

export { InvalidClientMessageError, mergeClientMessage, type ApprovalDecision } from "@/server/agent/merge";
