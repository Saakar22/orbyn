"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "All" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "DRAFT", label: "Draft" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function InvoiceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();
  const status = params.get("status") ?? "";

  function update(next: Record<string, string>) {
    const search = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    startTransition(() => router.replace(`${pathname}?${search.toString()}`));
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query !== (params.get("q") ?? "")) update({ q: query });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 overflow-x-auto rounded-md border bg-card p-0.5">
        {STATUSES.map((option) => (
          <button
            key={option.value}
            onClick={() => update({ status: option.value })}
            className={cn(
              "shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors",
              status === option.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="relative sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search client, number, description"
          className="h-8 pl-8 text-[13px]"
        />
      </div>
    </div>
  );
}
