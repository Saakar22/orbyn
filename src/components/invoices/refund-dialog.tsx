"use client";

import { Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { refundPaymentAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, toMinor, toPayPalValue } from "@/lib/money";
import { checkRefundAmount, invoiceAfterRefund } from "@/lib/payments";

type Props = {
  transactionId: string;
  invoiceId: string;
  currency: string;
  refundableMinor: number;
  payerEmail: string | null;
  invoice: { totalMinor: number; amountPaidMinor: number; status: string; invoiceNumber: string };
};

export function RefundDialog({ transactionId, invoiceId, currency, refundableMinor, payerEmail, invoice }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(toPayPalValue(refundableMinor));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  let amountMinor: number | null = null;
  try {
    amountMinor = toMinor(amount);
  } catch {
    amountMinor = null;
  }
  const check = amountMinor === null ? null : checkRefundAmount(amountMinor, refundableMinor);
  const valid = check?.ok === true;
  const hint = amount.trim() === "" ? null : !check ? "Enter an amount like 250 or 250.50." : check.ok ? null : check.reason;
  const reopens = valid && amountMinor !== null && invoiceAfterRefund(invoice, amountMinor).reopened;
  const money = (minor: number) => formatMoney(minor, currency);

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await refundPaymentAction(transactionId, invoiceId, amount, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.value.state === "failed") {
        setError("PayPal could not process this refund. Nothing was returned to the payer.");
        return;
      }
      toast.success(
        result.value.state === "pending"
          ? `Refund of ${money(result.value.amountMinor)} is processing at PayPal`
          : `Refunded ${money(result.value.amountMinor)}`,
      );
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setAmount(toPayPalValue(refundableMinor));
          setReason("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground">
          <Undo2 className="size-3" /> Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            Money goes back to {payerEmail ?? "the payer"} through PayPal. Up to {money(refundableMinor)} can be refunded. This can&apos;t be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`refund-amount-${transactionId}`}>Amount ({currency})</Label>
            <Input
              id={`refund-amount-${transactionId}`}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              disabled={pending}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(hint)}
            />
            {hint ? <p className="text-xs text-danger">{hint}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`refund-reason-${transactionId}`}>Note to payer (optional)</Label>
            <Input
              id={`refund-reason-${transactionId}`}
              maxLength={255}
              value={reason}
              disabled={pending}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {reopens ? (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-xs">
              {invoice.invoiceNumber} is marked paid. After this refund it will be open again with a balance due.
            </p>
          ) : null}
          {error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Keep payment
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!valid || pending}>
            {pending ? "Refunding…" : valid && amountMinor !== null ? `Refund ${money(amountMinor)}` : "Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
