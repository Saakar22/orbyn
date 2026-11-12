import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { DemoBanner } from "@/components/shell/demo-banner";
import { UserBlock } from "@/components/shell/user-block";
import { WelcomeTour } from "@/components/shell/welcome-tour";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthContext } from "@/server/session";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      userMenu={
        <Suspense fallback={<Skeleton className="h-10 bg-sidebar-accent" />}>
          <UserBlock />
        </Suspense>
      }
    >
      <Suspense>
        <DemoBanner />
      </Suspense>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      <Suspense>
        <TourGate />
      </Suspense>
    </AppShell>
  );
}

/** Shows the welcome tour until the person has seen it once. Remembered on their account, not in the browser. */
async function TourGate() {
  const context = await getAuthContext();
  if (!context || !context.user.onboardedAt || context.user.tourDismissedAt) return null;
  return <WelcomeTour firstName={context.user.name.split(" ")[0]} />;
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8" aria-busy aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
