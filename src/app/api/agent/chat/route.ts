import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { z } from "zod";
import {
  getConversation,
  InvalidClientMessageError,
  mergeClientMessage,
  saveConversation,
} from "@/server/agent/conversations";
import { buildInstructions } from "@/server/agent/instructions";
import { createOrbynTools, type OrbynUIMessage } from "@/server/agent/tools";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit";
import { requireUserId, UnauthorizedError } from "@/server/session";

export const maxDuration = 60;

const body = z.object({ id: z.string().min(1), message: z.unknown() });

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const conversation = await getConversation(userId, parsed.data.id);
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });

  let merged: ReturnType<typeof mergeClientMessage>;
  try {
    merged = mergeClientMessage(conversation.messages, parsed.data.message);
  } catch (error) {
    if (error instanceof InvalidClientMessageError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }

  for (const decision of merged.decisions) {
    await audit({
      userId,
      actor: "user",
      action: decision.approved ? "agent.approval.granted" : "agent.approval.denied",
      entityType: "AgentToolCall",
      entityId: decision.toolCallId,
      metadata: { toolName: decision.toolName, input: decision.input as never },
    });
  }

  const tools = createOrbynTools(userId);
  const messages = await validateUIMessages<OrbynUIMessage>({ messages: merged.messages, tools });

  const [user, clients] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.client.findMany({ where: { userId }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-flash-latest"),
    instructions: buildInstructions({
      userName: user.name,
      businessName: user.businessName,
      clientNames: clients.map((c) => c.name),
      now: new Date(),
    }),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    toolApproval: { issue_invoice: "user-approval" },
    experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET,
    stopWhen: isStepCount(6),
    temperature: 0.2,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream<typeof tools, OrbynUIMessage>({
      stream: result.stream,
      tools,
      originalMessages: messages,
      generateMessageId: generateId,
      onError: (error) => {
        console.error("[agent] stream error", error);
        return "Orbyn ran into a problem reaching the AI model. Please try again.";
      },
      onEnd: async ({ messages: finalMessages }) => {
        await saveConversation(conversation.id, finalMessages);
      },
    }),
  });
}
