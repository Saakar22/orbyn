import { CheckCircle2, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireUser } from "@/server/session";

export const metadata = { title: "Settings" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Configured({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? "inline-flex items-center gap-1.5 text-success" : "inline-flex items-center gap-1.5 text-muted-foreground"}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {label}
    </span>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const paypalConfigured = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const sandbox = process.env.PAYPAL_ENV === "sandbox" && (process.env.PAYPAL_BASE_URL ?? "").includes("sandbox");

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Workspace profile and integrations." />
      <section className="max-w-2xl overflow-hidden rounded-lg border bg-card text-[13px]">
        <h2 className="border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</h2>
        <Row label="Name">{user.name}</Row>
        <Row label="Business">{user.businessName ?? "—"}</Row>
        <Row label="Email">{user.email}</Row>
        <Row label="Default currency">{user.defaultCurrency}</Row>
      </section>
      <section className="max-w-2xl overflow-hidden rounded-lg border bg-card text-[13px]">
        <h2 className="border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Integrations</h2>
        <Row label="PayPal">
          <Configured ok={paypalConfigured && sandbox} label={paypalConfigured ? (sandbox ? "Sandbox connected" : "Not sandbox: blocked") : "Not configured"} />
        </Row>
        <Row label="PayPal webhooks">
          <Configured ok={Boolean(process.env.PAYPAL_WEBHOOK_ID)} label={process.env.PAYPAL_WEBHOOK_ID ? "Webhook ID set" : "Not configured"} />
        </Row>
        <Row label="AI model">
          <Configured
            ok={Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)}
            label={process.env.GOOGLE_GENERATIVE_AI_API_KEY ? `Gemini · ${process.env.GEMINI_MODEL || "gemini-flash-latest"}` : "Gemini key missing"}
          />
        </Row>
      </section>
    </PageContainer>
  );
}
