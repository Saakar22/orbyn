import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { getAuthContext } from "@/server/session";

/** Stays on every app page while someone is exploring as a guest. */
export async function DemoBanner() {
  const context = await getAuthContext();
  if (!context?.user.isGuest) return null;

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[oklch(0.88_0.07_80)] bg-warning-soft px-4 py-2 text-[13px] text-[oklch(0.36_0.09_65)]">
      <span className="inline-flex items-center gap-1.5">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        You&rsquo;re in a demo workspace. Create an account to keep your data.
      </span>
      <Link href="/signup" className="rounded-md bg-[oklch(0.36_0.09_65)] px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90">
        Create account
      </Link>
    </div>
  );
}
