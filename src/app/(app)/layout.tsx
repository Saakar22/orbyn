import { Suspense } from "react";
import Link from "next/link";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";
import { DemoBanner } from "@/components/shell/demo-banner";
import { NavLinks, SidebarNav } from "@/components/shell/sidebar-nav";
import { UserBlock } from "@/components/shell/user-block";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar md:sticky md:top-0 md:h-screen md:w-56">
        <div className="flex items-center justify-between px-4 py-3.5 md:py-4">
          <Link href="/dashboard">
            <OrbynWordmark inverted />
          </Link>
          <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/80">
            Sandbox
          </span>
        </div>
        <div className="px-2 pb-2 md:flex-1 md:pb-0">
          <Suspense fallback={<NavLinks />}>
            <SidebarNav />
          </Suspense>
        </div>
        <div className="hidden border-t border-sidebar-border p-2 md:block">
          <Suspense fallback={<Skeleton className="h-10 bg-sidebar-accent" />}>
            <UserBlock />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Suspense>
          <DemoBanner />
        </Suspense>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
