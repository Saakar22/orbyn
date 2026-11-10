"use client";

import { BellPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createReminderAction, type ReminderFormState } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REMINDER_TONES, TONE_LABELS, type ReminderTone } from "@/lib/reminders";
import { cn } from "@/lib/utils";

type Props = { invoiceId: string; templates: Record<ReminderTone, string>; suggestedTone: ReminderTone; today: string };

export function ReminderForm({ invoiceId, templates, suggestedTone, today }: Props) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<ReminderTone>(suggestedTone);
  const [message, setMessage] = useState(templates[suggestedTone]);
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState<ReminderFormState, FormData>(async (prev, formData) => {
    const result = await createReminderAction(invoiceId, prev, formData);
    if (result?.ok) {
      toast.success("Reminder scheduled");
      setOpen(false);
      setEdited(false);
      setMessage(templates[tone]);
    }
    return result;
  }, undefined);

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setOpen(true)}>
        <BellPlus className="size-3.5" /> New reminder
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-md border bg-muted/30 p-3">
      <input type="hidden" name="tone" value={tone} />
      <div role="radiogroup" aria-label="Tone" className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1 text-xs">
        {REMINDER_TONES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={tone === value}
            onClick={() => {
              setTone(value);
              // Swap the template unless the user has written their own text.
              if (!edited) setMessage(templates[value]);
            }}
            className={cn(
              "rounded px-2 py-1 font-medium transition-colors",
              tone === value ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TONE_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reminder-message" className="text-xs">
          Message
        </Label>
        <Textarea
          id="reminder-message"
          name="message"
          rows={8}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setEdited(true);
          }}
          className="text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reminder-date" className="text-xs">
          Remind me on
        </Label>
        <Input id="reminder-date" name="sendOn" type="date" min={today} defaultValue={today} className="h-8 text-xs" />
      </div>

      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Schedule"}
        </Button>
      </div>
    </form>
  );
}
