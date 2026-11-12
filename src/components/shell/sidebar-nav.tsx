"use client";

import Link from "next/link";
import { ArrowLeftRight, FileText, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: Sparkles, ai: true },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks({ pathname, collapsed = false, large = false }: { pathname?: string; collapsed?: boolean; large?: boolean }) {
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, ai }) => {
        const active = pathname !== undefined && (pathname === href || pathname.startsWith(`${href}/`));
        const link = (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-2.5 rounded-md font-medium transition-colors",
              large ? "h-11 px-3 text-[15px]" : "h-8 text-[13px]",
              collapsed ? "justify-center" : !large && "px-2.5",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {/* A slim marker makes the current page readable at a glance, including when collapsed. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 left-0 h-4 w-[3px] -translate-x-2 -translate-y-1/2 rounded-full bg-[oklch(0.78_0.14_292)] transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon className={cn("size-4 shrink-0", ai ? "text-[oklch(0.78_0.14_292)]" : active ? "opacity-100" : "opacity-80")} strokeWidth={1.8} aria-hidden />
            {collapsed ? null : label}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}
