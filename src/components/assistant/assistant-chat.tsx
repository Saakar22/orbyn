"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { ArrowUp, Loader2, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OrbynUIMessage } from "@/server/agent/tools";
import { MessageParts } from "./message-parts";

const SUGGESTIONS = [
  "Create an invoice for Alex for $500 for website development",
  "How much money am I still waiting to receive?",
  "Which clients have overdue payments?",
  "Summarize my financial activity this month",
  "Show me my five most recent transactions",
  "Compare this month's revenue with last month",
];

export function AssistantChat({
  conversationId,
  initialMessages,
  initialPrompt,
}: {
  conversationId: string;
  initialMessages: OrbynUIMessage[];
  initialPrompt?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const { messages, sendMessage, status, error, stop, addToolApprovalResponse, clearError } = useChat<OrbynUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      // The server owns history; only the newest message is sent.
      prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages.at(-1) } }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => router.refresh(),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (initialPrompt && !sentInitial.current && initialMessages.length === 0) {
      sentInitial.current = true;
      void sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, initialMessages.length, sendMessage]);

  useEffect(() => {
    // Give the conversation a stable URL once it has content.
    if (messages.length > 0 && !window.location.pathname.endsWith(conversationId)) {
      window.history.replaceState(null, "", `/assistant/${conversationId}`);
    }
  }, [messages.length, conversationId]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    clearError();
    void sendMessage({ text: value });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100dvh-104px)] flex-col md:h-dvh">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
          {messages.length === 0 ? (
            <div className="pt-6 md:pt-16">
              <div className="flex size-9 items-center justify-center rounded-lg bg-ai-soft">
                <Sparkles className="size-4.5 text-ai" />
              </div>
              <h1 className="mt-4 text-xl font-semibold tracking-tight">What should Orbyn take care of?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Invoices, payments, follow-ups and financial questions. Anything that saves data or moves money waits for
                your approval.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => submit(suggestion)}
                    className="rounded-lg border bg-card px-3.5 py-2.5 text-left text-[13px] text-foreground/90 transition-colors hover:border-ring/40 hover:bg-accent/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-primary px-3.5 py-2 text-[14px] text-primary-foreground">
                  {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-ai-soft">
                  <Sparkles className="size-3.5 text-ai" />
                </div>
                <div className="min-w-0 flex-1">
                  <MessageParts message={message} respond={addToolApprovalResponse} />
                </div>
              </div>
            ),
          )}

          {status === "submitted" ? (
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-md bg-ai-soft">
                <Loader2 className="size-3.5 animate-spin text-ai" />
              </div>
              Thinking…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
              {error.message || "Something went wrong."}{" "}
              <button className="font-medium underline" onClick={() => clearError()}>
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <form
          className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-lg border bg-card p-1.5 focus-within:border-ring/50"
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask Orbyn to invoice a client, check what's overdue, summarize revenue…"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Stop">
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-muted-foreground">
          Orbyn uses your real workspace data. Payments run in PayPal Sandbox.
        </p>
      </div>
    </div>
  );
}
