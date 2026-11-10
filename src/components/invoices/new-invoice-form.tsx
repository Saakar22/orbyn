"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createInvoiceAction } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeTotals, formatMoney, SUPPORTED_CURRENCIES, toMinor } from "@/lib/money";

type Line = { description: string; quantity: string; unitPrice: string };
type ClientOption = { name: string; email: string | null; company: string | null };

const emptyLine: Line = { description: "", quantity: "1", unitPrice: "" };

function safeMinor(value: string) {
  try {
    return value ? toMinor(value) : 0;
  } catch {
    return 0;
  }
}

export function NewInvoiceForm({ clients, defaultDueDate }: { clients: ClientOption[]; defaultDueDate: string }) {
  const [state, formAction, pending] = useActionState(createInvoiceAction, undefined);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [client, setClient] = useState<ClientOption>({ name: "", email: "", company: "" });

  // Preview only; the server recomputes totals from the submitted items.
  const totals = computeTotals(
    lines.map((line) => ({ quantity: Number(line.quantity) || 0, unitPriceMinor: safeMinor(line.unitPrice) })),
    Math.round((Number(taxRate) || 0) * 100),
  );
  const itemsJson = JSON.stringify(
    lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    })),
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function selectClient(name: string) {
    const match = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
    setClient(match ? { ...match } : { ...client, name });
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <input type="hidden" name="items" value={itemsJson} />
      <div className="space-y-6 rounded-lg border bg-card p-5 md:p-6">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</legend>
          <div className="space-y-1.5">
            <Label htmlFor="clientName">Name</Label>
            <Input
              id="clientName"
              name="clientName"
              list="client-options"
              required
              value={client.name}
              onChange={(e) => selectClient(e.target.value)}
              placeholder="Alex Rivera"
            />
            <datalist id="client-options">
              {clients.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              value={client.email ?? ""}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              placeholder="alex@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientCompany">Company</Label>
            <Input
              id="clientCompany"
              name="clientCompany"
              value={client.company ?? ""}
              onChange={(e) => setClient({ ...client, company: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Line items</legend>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_64px_110px_32px] items-center gap-2">
                <Input
                  aria-label="Description"
                  required
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="Website development"
                />
                <Input
                  aria-label="Quantity"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                />
                <Input
                  aria-label="Unit price"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  aria-label="Remove line"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 gap-1.5 text-muted-foreground"
            onClick={() => setLines((current) => [...current, { ...emptyLine }])}
          >
            <Plus className="size-3.5" /> Add line
          </Button>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Terms</legend>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxRatePercent">Tax rate (%)</Label>
            <Input
              id="taxRatePercent"
              name="taxRatePercent"
              type="number"
              min={0}
              max={50}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" required defaultValue={defaultDueDate} />
          </div>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-lg border bg-card p-5 lg:sticky lg:top-6">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatMoney(totals.subtotalMinor, currency)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Tax</dt>
            <dd className="tabular">{formatMoney(totals.taxMinor, currency)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatMoney(totals.totalMinor, currency)}</dd>
          </div>
        </dl>
        {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save invoice
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Saved invoices are marked pending and get a private PayPal checkout link.
        </p>
      </aside>
    </form>
  );
}
