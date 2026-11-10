import { describe, expect, it } from "vitest";
import { InvalidClientMessageError, mergeClientMessage } from "@/server/agent/merge";
import type { OrbynUIMessage } from "@/server/agent/tools";

const pending = {
  type: "tool-issue_invoice",
  toolCallId: "call_1",
  state: "approval-requested",
  input: { invoiceId: "inv_real" },
  approval: { id: "appr_1", signature: "sig" },
};

const stored = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Invoice Alex $500" }] },
  { id: "a1", role: "assistant", parts: [pending] },
] as unknown as OrbynUIMessage[];

function answer(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ ...pending, state: "approval-responded", approval: { id: "appr_1", approved: true }, ...overrides }],
  };
}

describe("mergeClientMessage", () => {
  it("applies an approval decision to the stored part", () => {
    const { messages, decisions } = mergeClientMessage(stored, answer());
    expect(decisions).toEqual([{ toolName: "issue_invoice", toolCallId: "call_1", approved: true, input: { invoiceId: "inv_real" } }]);
    const part = messages[1].parts[0] as unknown as { state: string; approval: { approved: boolean; signature: string } };
    expect(part.state).toBe("approval-responded");
    expect(part.approval.signature).toBe("sig");
  });

  it("ignores tampered tool input from the client", () => {
    const { messages } = mergeClientMessage(stored, answer({ input: { invoiceId: "inv_attacker" } }));
    const part = messages[1].parts[0] as unknown as { input: { invoiceId: string } };
    expect(part.input.invoiceId).toBe("inv_real");
  });

  it("rejects approvals with a mismatched approval id", () => {
    expect(() => mergeClientMessage(stored, answer({ approval: { id: "forged", approved: true } }))).toThrow(
      InvalidClientMessageError,
    );
  });

  it("rejects rewriting older assistant messages", () => {
    expect(() => mergeClientMessage(stored, { ...answer(), id: "older" })).toThrow(InvalidClientMessageError);
  });

  it("accepts a new user message as plain text only", () => {
    const { messages } = mergeClientMessage(stored, {
      id: "u2",
      role: "user",
      parts: [{ type: "text", text: "  show unpaid  " }, { type: "tool-issue_invoice", state: "output-available" }],
    });
    expect(messages.at(-1)).toEqual({ id: "u2", role: "user", parts: [{ type: "text", text: "show unpaid" }] });
  });

  it("rejects a client-sent assistant message with no pending approval", () => {
    const done = [stored[0], { id: "a1", role: "assistant", parts: [{ type: "text", text: "hi" }] }] as unknown as OrbynUIMessage[];
    expect(() => mergeClientMessage(done, answer())).toThrow(InvalidClientMessageError);
  });
});
