"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { OrbynMark, OrbynWordmark } from "@/components/brand/orbyn-mark";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavLinks } from "@/components/shell/sidebar-nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "orbyn.sidebar";

const ShellContext = createContext<{ collapsed: boolean; openPalette: () => void }>({ collapsed: false, openPalette: () => {} });
export const useShell = () => use(ShellContext);

function SandboxTag() {
  return (
    <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-sidebar-foreground/80 uppercase">
      Sandbox
    </span>
  );
}

/**
 * The frame around every signed-in page: a collapsible sidebar on desktop, a top bar with a
 * slide-in drawer on phones, and the command palette. `userMenu` is rendered on the server.
 */
export function AppShell({ userMenu, children }: { userMenu: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);

  // Close the phone drawer after navigating (derived during render, no effect needed).
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a browser-only preference after hydration
      if (window.localStorage.getItem(STORAGE_KEY) === "collapsed") setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, current ? "open" : "collapsed");
      } catch {}
      return !current;
    });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell = { collapsed, openPalette: () => setPaletteOpen(true) };
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <ShellContext value={shell}>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-card focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:shadow-modal"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "sticky top-0 z-20 hidden h-screen shrink-0 flex-col bg-sidebar transition-[width] duration-200 ease-out-soft md:flex",
            collapsed ? "w-[60px]" : "w-56",
          )}
        >
          <div className={cn("flex h-14 items-center", collapsed ? "justify-center" : "justify-between px-4")}>
            <Link href="/dashboard" aria-label="Orbyn dashboard">
              {collapsed ? <OrbynMark /> : <OrbynWordmark inverted />}
            </Link>
            {collapsed ? null : <SandboxTag />}
          </div>

          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={shell.openPalette}
              aria-label="Search and commands"
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center" : "px-2.5",
              )}
            >
              <Search className="size-3.5 shrink-0" aria-hidden />
              {collapsed ? null : (
                <>
                  <span className="flex-1 text-left">Search</span>
                  <kbd className="rounded border border-sidebar-border px-1 font-sans text-[10px] text-sidebar-foreground/70">Ctrl K</kbd>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <NavLinks pathname={pathname} collapsed={collapsed} />
          </div>

          <div className="px-2 pb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!collapsed}
                  className={cn(
                    "flex h-8 w-full items-center gap-2.5 rounded-md text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    collapsed ? "justify-center" : "px-2.5",
                  )}
                >
                  <CollapseIcon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {collapsed ? null : "Collapse"}
                </button>
              </TooltipTrigger>
              {collapsed ? <TooltipContent side="right">Expand sidebar</TooltipContent> : null}
            </Tooltip>
          </div>
          <div className="border-t border-sidebar-border p-2">{userMenu}</div>
        </aside>

        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-2 bg-sidebar px-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-md text-sidebar-accent-foreground hover:bg-sidebar-accent"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Link href="/dashboard" aria-label="Orbyn dashboard">
            <OrbynWordmark inverted />
          </Link>
          <button
            type="button"
            onClick={shell.openPalette}
            aria-label="Search and commands"
            className="grid size-9 place-items-center rounded-md text-sidebar-accent-foreground hover:bg-sidebar-accent"
          >
            <Search className="size-[18px]" aria-hidden />
          </button>
        </header>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" showCloseButton={false} className="w-[17rem] gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigate between the sections of your workspace.</SheetDescription>
            <div className="flex h-14 items-center justify-between px-4">
              <OrbynWordmark inverted />
              <SandboxTag />
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              <NavLinks pathname={pathname} large />
            </div>
            <div className="border-t border-sidebar-border p-2">
              <ShellContext value={{ ...shell, collapsed: false }}>{userMenu}</ShellContext>
            </div>
          </SheetContent>
        </Sheet>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </ShellContext>
  );
}
