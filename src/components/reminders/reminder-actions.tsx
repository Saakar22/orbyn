"use client";

import { Copy, Send, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelReminderAction, markReminderSentAction } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { mailtoHref } from "@/lib/reminders";

type Props = {
  reminderId: string;
  invoiceId: string;
  status: string;
  clientEmail: string | null;
  subject: string;
  message: string;
};

/** Orbyn has no outbound email yet: "Send" hands the message to the owner's mail app, then records it as sent. */
export function ReminderActions({ reminderId, invoiceId, status, clientEmail, subject, message }: Props) {
  const [pending, start] = useTransition();
  const open = status === "SCHEDULED" || status === "DUE";
  const cancellable = open || status === "DRAFT";
  if (!cancellable) return null;

  const markSent = () =>
    start(async () => {
      await markReminderSentAction(reminderId, invoiceId);
      toast.success("Marked as sent");
    });

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {open && clientEmail ? (
        <Button asChild size="sm" variant={status === "DUE" ? "default" : "outline"} className="h-7 gap-1 px-2 text-xs" disabled={pending}>
          <a href={mailtoHref(clientEmail, subject, message)} onClick={() => markSent()}>
            <Send className="size-3" /> Send email
          </a>
        </Button>
      ) : null}
      {open && !clientEmail ? (
        <Button
          size="sm"
          variant={status === "DUE" ? "default" : "outline"}
          className="h-7 gap-1 px-2 text-xs"
          disabled={pending}
          onClick={async () => {
            await navigator.clipboard.writeText(`${subject}\n\n${message}`);
            toast.info("Copied. No email on file for this client, so paste it wherever you reach them.");
            markSent();
          }}
        >
          <Copy className="size-3" /> Copy & mark sent
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        disabled={pending}
        onClick={() => start(() => cancelReminderAction(reminderId, invoiceId))}
      >
        <X className="size-3" /> {status === "DRAFT" ? "Discard" : "Cancel"}
      </Button>
    </div>
  );
}
