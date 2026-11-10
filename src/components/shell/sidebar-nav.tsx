"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, FileText, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: Sparkles, ai: true },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Reads the URL, so it must sit inside <Suspense>; use <NavLinks /> without a pathname as the fallback. */
export function SidebarNav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav className="flex flex-row gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
      {NAV.map(({ href, label, icon: Icon, ai }) => {
        const active = pathname !== undefined && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-4", ai ? "text-[oklch(0.78_0.14_292)]" : "opacity-80")} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
