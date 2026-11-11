import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { createConversation, getConversation, listConversations } from "@/server/agent/conversations";
import { requireUser } from "@/server/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Assistant" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

export default async function AssistantPage({ params, searchParams }: PageProps<"/assistant/[[...id]]">) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedId = id?.[0];

  const conversation = requestedId
    ? await getConversation(user.id, requestedId)
    : { ...(await createConversation(user.id)), messages: [] };
  if (!conversation) notFound();

  const history = await listConversations(user.id);
  const prompt = typeof query.q === "string" ? query.q.slice(0, 500) : undefined;

  return (
    <div className="flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/50 lg:flex">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conversations</span>
          <Link
            href="/assistant"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="New conversation"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {history.map((item) => (
            <Link
              key={item.id}
              href={`/assistant/${item.id}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground",
                item.id === conversation.id && "bg-muted text-foreground",
              )}
            >
              <MessageSquare className="size-3.5 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
          {history.length === 0 ? <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p> : null}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <AssistantChat
          key={conversation.id}
          conversationId={conversation.id}
          initialMessages={conversation.messages}
          initialPrompt={prompt}
        />
      </div>
    </div>
  );
}
