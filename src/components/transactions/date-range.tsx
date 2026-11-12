"use client";

import { useQueryState } from "@/components/list-controls";
import { Input } from "@/components/ui/input";

/** From/to day pickers that write ?from= and ?to= to the URL. */
export function DateRange() {
  const { params, update } = useQueryState();
  const field = "h-9 w-[9.5rem] rounded-lg bg-card text-[13px]";
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <label className="sr-only" htmlFor="from">
        From date
      </label>
      <Input id="from" type="date" className={field} defaultValue={params.get("from") ?? ""} max={params.get("to") ?? undefined} onChange={(event) => update({ from: event.target.value || undefined })} />
      <span aria-hidden>to</span>
      <label className="sr-only" htmlFor="to">
        To date
      </label>
      <Input id="to" type="date" className={field} defaultValue={params.get("to") ?? ""} min={params.get("from") ?? undefined} onChange={(event) => update({ to: event.target.value || undefined })} />
    </div>
  );
}
