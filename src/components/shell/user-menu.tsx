"use client";

import Link from "next/link";
import { ChevronsUpDown, Keyboard, LogOut, Settings, UserPlus } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { useShell } from "@/components/shell/app-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserMenu({ name, business, email, isGuest }: { name: string; business: string; email: string; isGuest: boolean }) {
  const { collapsed, openPalette } = useShell();
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md py-1.5 text-left transition-colors hover:bg-sidebar-accent/70 aria-expanded:bg-sidebar-accent",
            collapsed ? "justify-center" : "px-1.5",
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border">
            {initials}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium text-sidebar-accent-foreground">{name}</span>
                <span className="block truncate text-[11px] text-sidebar-foreground/70">{business}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/60" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{business}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{isGuest ? "Demo guest, no account yet" : email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isGuest ? (
          <DropdownMenuItem asChild>
            <Link href="/signup">
              <UserPlus aria-hidden />
              Create an account
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openPalette()}>
          <Keyboard aria-hidden />
          Search and commands
          <DropdownMenuShortcut>Ctrl K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOutAction()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
