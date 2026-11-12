import { assistantModel } from "@/server/agent/model";
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
import { isSameOrigin } from "@/server/auth/origin";
import { requireWorkspaceId, UnauthorizedError } from "@/server/session";

export const maxDuration = 60;

const body = z.object({ id: z.string().min(1), message: z.unknown() });

export async function POST(request: Request) {
  // The session cookie rides along on cross-site requests too, so refuse anything not sent by our own pages.
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let workspaceId: string;
  try {
    workspaceId = await requireWorkspaceId();
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const conversation = await getConversation(workspaceId, parsed.data.id);
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
      workspaceId,
      actor: "user",
      action: decision.approved ? "agent.approval.granted" : "agent.approval.denied",
      entityType: "AgentToolCall",
      entityId: decision.toolCallId,
      metadata: { toolName: decision.toolName, input: decision.input as never },
    });
  }

  const tools = createOrbynTools(workspaceId);
  const messages = await validateUIMessages<OrbynUIMessage>({ messages: merged.messages, tools });

  const [workspace, clients] = await Promise.all([
    db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, include: { owner: { select: { name: true } } } }),
    db.client.findMany({ where: { workspaceId }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  const result = streamText({
    model: assistantModel(),
    instructions: buildInstructions({
      userName: workspace.owner.name,
      businessName: workspace.name,
      clientNames: clients.map((c) => c.name),
      now: new Date(),
    }),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    toolApproval: { issue_invoice: "user-approval", schedule_reminder: "user-approval" },
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
