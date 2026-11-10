// Pure function (no DB) so it can be unit tested. See mergeClientMessage below.
import { isToolUIPart, type UIMessage } from "ai";
import type { OrbynUIMessage } from "@/server/agent/tools";

export type ApprovalDecision = { toolName: string; toolCallId: string; approved: boolean; input: unknown };

export class InvalidClientMessageError extends Error {}

/**
 * Merge the client's newest message into server-held history.
 * - A new user message is accepted as plain text only.
 * - An assistant message is accepted only to answer pending approvals on the latest stored
 *   assistant message: we copy the approved/denied decision and nothing else.
 */
export function mergeClientMessage(stored: OrbynUIMessage[], incoming: unknown) {
  const message = incoming as Partial<UIMessage> | null;
  if (!message || typeof message.id !== "string" || !Array.isArray(message.parts)) {
    throw new InvalidClientMessageError("Malformed message");
  }

  if (message.role === "user") {
    if (stored.some((m) => m.id === message.id)) throw new InvalidClientMessageError("Duplicate message");
    const text = message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof (p as { text?: unknown }).text === "string")
      .map((p) => p.text)
      .join("\n")
      .trim()
      .slice(0, 4000);
    if (!text) throw new InvalidClientMessageError("Empty message");
    const userMessage: OrbynUIMessage = { id: message.id, role: "user", parts: [{ type: "text", text }] };
    return { messages: [...stored, userMessage], decisions: [] as ApprovalDecision[] };
  }

  const last = stored.at(-1);
  if (message.role !== "assistant" || !last || last.role !== "assistant" || last.id !== message.id) {
    throw new InvalidClientMessageError("Unexpected message");
  }

  const decisions: ApprovalDecision[] = [];
  type ClientAnswer = { toolCallId?: unknown; state?: unknown; approval?: { id?: unknown; approved?: unknown; reason?: unknown } };

  const parts = last.parts.map((part) => {
    if (!isToolUIPart(part) || part.state !== "approval-requested") return part;
    const answer = (message.parts as ClientAnswer[]).find(
      (p) => p.toolCallId === part.toolCallId && p.state === "approval-responded",
    );
    if (!answer?.approval || answer.approval.id !== part.approval.id || typeof answer.approval.approved !== "boolean") {
      return part;
    }

    decisions.push({
      toolName: part.type.replace(/^tool-/, ""),
      toolCallId: part.toolCallId,
      approved: answer.approval.approved,
      input: part.input,
    });
    return {
      ...part,
      state: "approval-responded",
      approval: {
        ...part.approval,
        approved: answer.approval.approved,
        reason: typeof answer.approval.reason === "string" ? answer.approval.reason.slice(0, 200) : undefined,
      },
    } as unknown as typeof part;
  });

  if (decisions.length === 0) throw new InvalidClientMessageError("No approval decisions found");
  return { messages: [...stored.slice(0, -1), { ...last, parts }], decisions };
}
