"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Asks before doing something that can't be undone. With `confirmText`, the person has to type
 * that exact text (their email, say) before the button unlocks.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmText,
  destructive = false,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmText?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void | { error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const unlocked = !confirmText || typed.trim().toLowerCase() === confirmText.toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmText ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-text" className="flex-wrap">
              Type <span className="font-mono text-[13px]">{confirmText}</span> to confirm
            </Label>
            <Input id="confirm-text" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep it
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!unlocked}
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result?.error) setError(result.error);
                else setOpen(false);
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
