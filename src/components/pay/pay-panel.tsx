"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { capturePayPalOrderAction, createPayPalOrderAction } from "@/app/actions/payments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, toMinor, toPayPalValue } from "@/lib/money";
import { checkPaymentAmount } from "@/lib/payments";
import { cn } from "@/lib/utils";

type Props = { token: string; clientId: string; currency: string; balanceMinor: number; minMinor: number };
type Done = { state: "paid" | "partial" | "pending"; amountMinor: number; balanceMinor: number };

function parseAmount(text: string): number | null {
  try {
    return toMinor(text);
  } catch {
    return null;
  }
}

export function PayPanel({ token, clientId, currency, balanceMinor, minMinor }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"full" | "custom">("full");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const amountMinor = mode === "full" ? balanceMinor : parseAmount(custom);
  const check = amountMinor === null ? null : checkPaymentAmount(amountMinor, balanceMinor);
  const valid = check?.ok === true;
  let amountError: string | null = null;
  if (mode === "custom" && custom.trim() !== "") {
    if (!check) amountError = "Enter an amount like 250 or 250.50.";
    else if (!check.ok) amountError = check.reason;
  }

  // PayPal's callbacks are created once; read the latest amount through a ref.
  const amountRef = useRef(amountMinor);
  useEffect(() => {
    amountRef.current = amountMinor;
  }, [amountMinor]);

  const money = (minor: number) => formatMoney(minor, currency);

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-md bg-success-soft/60 px-4 py-6 text-center">
        {done.state === "pending" ? <Clock className="size-8 text-warning" /> : <CheckCircle2 className="size-8 text-success" />}
        <div className="mt-3 font-semibold">
          {done.state === "paid" ? "Payment received — thank you!" : done.state === "partial" ? "Partial payment received" : "Payment is processing"}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {done.state === "pending"
            ? `PayPal is still processing ${money(done.amountMinor)}. This page will update once it clears.`
            : done.state === "partial"
              ? `${money(done.amountMinor)} paid. ${money(done.balanceMinor)} is still due.`
              : `${money(done.amountMinor)} paid. This invoice is settled.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Payment amount" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
        {(["full", "custom"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            disabled={busy}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "rounded px-3 py-1.5 font-medium transition-colors",
              mode === value ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "full" ? "Pay in full" : "Pay part"}
          </button>
        ))}
      </div>

      {mode === "custom" ? (
        <div className="space-y-1.5">
          <Label htmlFor="pay-amount">Amount ({currency})</Label>
          <Input
            id="pay-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder={toPayPalValue(Math.min(balanceMinor, Math.max(minMinor, Math.round(balanceMinor / 2))))}
            value={custom}
            disabled={busy}
            onChange={(event) => {
              setCustom(event.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(amountError)}
          />
          <p className={cn("text-xs", amountError ? "text-danger" : "text-muted-foreground")}>
            {amountError ?? `Between ${money(minMinor)} and ${money(balanceMinor)}.`}
          </p>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">You pay</span>
        <span className="tabular font-semibold">{valid && amountMinor !== null ? money(amountMinor) : "—"}</span>
      </div>

      {error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      <div className={cn("relative", busy && "pointer-events-none opacity-60")}>
        {busy ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        <PayPalScriptProvider options={{ clientId, currency, intent: "capture", components: "buttons" }}>
          <PayPalButtons
            style={{ layout: "vertical", label: "pay", height: 44 }}
            disabled={!valid || busy}
            forceReRender={[currency]}
            onClick={(_data, actions) => {
              const current = amountRef.current;
              if (current === null || !checkPaymentAmount(current, balanceMinor).ok) {
                setError("Enter a valid amount first.");
                return actions.reject();
              }
              setError(null);
              return actions.resolve();
            }}
            createOrder={async () => {
              const result = await createPayPalOrderAction(token, toPayPalValue(amountRef.current ?? 0));
              if (!result.ok) {
                setError(result.error);
                throw new Error(result.error);
              }
              return result.value;
            }}
            onApprove={async (data) => {
              setBusy(true);
              const result = await capturePayPalOrderAction(token, data.orderID);
              setBusy(false);
              if (!result.ok) {
                setError(result.error);
                router.refresh();
                return;
              }
              if (result.value.state === "failed") {
                setError("PayPal declined the payment. You have not been charged.");
                return;
              }
              setDone({ state: result.value.state, amountMinor: result.value.amountMinor, balanceMinor: result.value.balanceMinor });
              router.refresh();
            }}
            onError={() => {
              setBusy(false);
              setError((current) => current ?? "Something went wrong with PayPal. You have not been charged.");
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
