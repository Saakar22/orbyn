import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { BusinessForm, Panel, PasswordForm, ProfileForm, SessionsPanel, WorkspaceDanger } from "@/components/settings/settings-forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { listSessions } from "@/server/auth/accounts";
import { paypalStatus } from "@/server/paypal/status";
import { requireWorkspace } from "@/server/session";

export const metadata = { title: "Settings" };

// Reads the signed-in session, so navigation waits for the server by design (opts out of instant-navigation validation).
export const instant = false;

const TABS = ["profile", "business", "security", "workspace"] as const;

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={ok ? "inline-flex items-center gap-1.5 text-success" : "inline-flex items-center gap-1.5 text-muted-foreground"}>
      {ok ? <CheckCircle2 className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { user, workspace, sessionId } = await requireWorkspace();
  const { tab } = await searchParams;
  const initial = TABS.find((value) => value === tab) ?? "profile";
  const zone = { timeZone: workspace.timezone };
  const sessions = (await listSessions(user.id)).map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    signedIn: formatDate(session.createdAt, { month: "short", day: "numeric", year: "numeric", ...zone }),
    lastActive: formatDate(session.lastSeenAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...zone }),
  }));
  const paypal = paypalStatus();

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Your profile, business details, security and workspace." />
      <Tabs defaultValue={initial} className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="max-w-3xl">
          <ProfileForm name={user.name} email={user.email} isGuest={user.isGuest} />
        </TabsContent>

        <TabsContent value="business" className="max-w-3xl space-y-6">
          <BusinessForm name={workspace.name} currency={workspace.currency} timezone={workspace.timezone} />
          <Panel title="Integrations" description="Set on the server by whoever runs this Orbyn. Keys are never entered or shown here.">
            <dl className="divide-y text-[13px]">
              {[
                ["PayPal", <Status key="p" ok={paypal.connected && paypal.sandbox}>{paypal.connected ? (paypal.sandbox ? "Sandbox connected" : "Not sandbox: payments blocked") : "Not configured"}</Status>],
                ["PayPal webhooks", <Status key="w" ok={Boolean(process.env.PAYPAL_WEBHOOK_ID)}>{process.env.PAYPAL_WEBHOOK_ID ? "Receiving events" : "Not configured"}</Status>],
                ["AI model", <Status key="a" ok={Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)}>{process.env.GOOGLE_GENERATIVE_AI_API_KEY ? `Gemini · ${process.env.GEMINI_MODEL || "gemini-flash-latest"}` : "Gemini key missing"}</Status>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </TabsContent>

        <TabsContent value="security" className="max-w-3xl space-y-6">
          <PasswordForm hasPassword={user.hasPassword} isGuest={user.isGuest} />
          <SessionsPanel sessions={sessions} currentId={sessionId} />
        </TabsContent>

        <TabsContent value="workspace" className="max-w-3xl">
          <WorkspaceDanger email={user.email} isGuest={user.isGuest} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
