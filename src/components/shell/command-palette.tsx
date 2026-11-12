"use client";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BellRing, Download, FilePlus2, LogOut, MessageSquarePlus, PieChart, Search, type LucideIcon } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { NAV } from "@/components/shell/sidebar-nav";

type Entry = { label: string; icon: LucideIcon; keywords?: string; run: () => void };

/** A file download, not a page: a plain link click keeps the current page in place. */
const download = (href: string) => () => {
  const link = Object.assign(document.createElement("a"), { href, download: "" });
  link.click();
};

const ask = (prompt: string) => `/assistant?draft=${encodeURIComponent(prompt)}`;

/** Ctrl/Cmd+K: jump to a page or start a common task from anywhere in the app. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  const groups: { heading: string; entries: Entry[] }[] = [
    {
      heading: "Go to",
      entries: NAV.map(({ href, label, icon }) => ({ label, icon, run: go(href) })),
    },
    {
      heading: "Do",
      entries: [
        { label: "New invoice", icon: FilePlus2, keywords: "create bill", run: go("/invoices/new") },
        { label: "Ask the assistant", icon: MessageSquarePlus, keywords: "chat orbyn ai", run: go("/assistant") },
        { label: "Draft reminders for overdue invoices", icon: BellRing, keywords: "follow up chase late", run: go(ask("Draft polite reminders for my overdue invoices")) },
        { label: "Summarise this month", icon: PieChart, keywords: "revenue report summary", run: go(ask("Summarize my financial activity this month")) },
        { label: "Export transactions as CSV", icon: Download, keywords: "download spreadsheet", run: download("/api/transactions/export") },
      ],
    },
    {
      heading: "Account",
      entries: [{ label: "Sign out", icon: LogOut, keywords: "log out", run: () => void signOutAction() }],
    },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search and commands"
      overlayClassName="fixed inset-0 z-50 bg-[oklch(0.19_0.035_272/0.35)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
      contentClassName="fixed top-[14vh] left-1/2 z-50 w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover shadow-modal outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <div className="flex items-center gap-2.5 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Command.Input
          placeholder="Search pages and actions…"
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded border px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">Esc</kbd>
      </div>
      <Command.List className="max-h-[min(22rem,60vh)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          Nothing matches. Try “invoice”, “transactions” or “sign out”.
        </Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {group.entries.map(({ label, icon: Icon, keywords, run }) => (
              <Command.Item
                key={label}
                value={`${label} ${keywords ?? ""}`}
                onSelect={() => {
                  onOpenChange(false);
                  run();
                }}
                className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-foreground/90 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden />
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
