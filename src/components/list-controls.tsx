"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Update the query string without a full navigation. Changing a filter always returns to page 1. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    if (!("page" in next)) search.delete("page");
    const query = search.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return { params, update, pending };
}

export function SearchBox({ placeholder, label }: { placeholder: string; label: string }) {
  const { params, update, pending } = useQueryState();
  const current = params.get("q") ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (value === current) return;
    const handle = setTimeout(() => update({ q: value.trim() || undefined }), 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-72">
      {pending ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      )}
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-lg bg-card pl-8 text-[13px]"
      />
    </div>
  );
}

export function FilterTabs({ name, options, label }: { name: string; options: { value: string; label: string; count?: number }[]; label: string }) {
  const { params, update } = useQueryState();
  const active = params.get(name) ?? options[0].value;

  return (
    <div role="tablist" aria-label={label} className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border bg-card p-0.5">
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => update({ [name]: option.value === options[0].value ? undefined : option.value })}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              selected ? "bg-secondary text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("tabular rounded px-1 text-[10px]", selected ? "bg-background text-foreground" : "bg-muted text-muted-foreground")}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** "1–20 of 27" with previous/next links that keep the other filters. */
export function Pagination({ page, pageSize, total, noun }: { page: number; pageSize: number; total: number; noun: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const href = (target: number) => {
    const search = new URLSearchParams(params);
    if (target <= 1) search.delete("page");
    else search.set("page", String(target));
    const query = search.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const step = "grid size-8 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:text-foreground";

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
      <span className="tabular">
        {first}–{last} of {total} {noun}
      </span>
      {pages > 1 ? (
        <span className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link href={href(page - 1)} scroll={false} className={step} aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(step, "opacity-40")} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
          <span className="tabular px-1">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} scroll={false} className={step} aria-label="Next page">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(step, "opacity-40")} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </span>
      ) : null}
    </nav>
  );
}
