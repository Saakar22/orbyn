import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanPreview } from "@/components/auth/plan-preview";
import { OrbynWordmark } from "@/components/brand/orbyn-mark";
import { instrumentSerif } from "@/lib/fonts";
import "./auth.css";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`${instrumentSerif.variable} grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]`}>
      {/* Editorial panel. Decorative on small screens, so it is dropped there to keep the form first. */}
      <aside className="auth-panel hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <Link href="/" aria-label="Orbyn home" className="w-fit">
          <OrbynWordmark inverted />
        </Link>
        <div className="grid gap-10 xl:grid-cols-[1fr_auto] xl:items-end">
          <p className="auth-display max-w-[11ch]">Your finances, on instruction.</p>
          <div className="justify-self-end">
            <PlanPreview />
          </div>
        </div>
        <p className="max-w-[36ch] text-[13px] leading-relaxed text-[#d3cdea]">
          Orbyn drafts the work and waits. Nothing is issued, sent or charged until you approve it, and an invoice is only marked
          paid once PayPal confirms the money arrived.
        </p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Orbyn home" className="lg:invisible">
            <OrbynWordmark />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to site
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
