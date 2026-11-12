"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Laptop, LogOut, RefreshCcw, Smartphone, Trash2 } from "lucide-react";
import {
  changePasswordAction,
  deleteAccountAction,
  resetDemoDataAction,
  signOutOtherSessionsAction,
  updateBusinessAction,
  updateProfileAction,
  type SettingsState,
} from "@/app/actions/settings";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PasswordInput } from "@/components/ui/password-input";
import { CURRENCIES } from "@/lib/workspace-options";

const CONTROL = "h-10 rounded-lg";

export function Panel({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-raised">
      <header className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
      </header>
      <div className="px-5 py-5">{children}</div>
      {footer ? <div className="flex justify-end gap-2 border-t bg-muted/30 px-5 py-3">{footer}</div> : null}
    </section>
  );
}

/** Show a success toast for a saved form. */
function useSaved(state: SettingsState) {
  useEffect(() => {
    if (state?.ok) toast.success(state.ok);
  }, [state]);
}

export function ProfileForm({ name, email, isGuest }: { name: string; email: string; isGuest: boolean }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  useSaved(state);
  return (
    <form action={action}>
      <Panel
        title="Profile"
        description="How you appear in Orbyn."
        footer={
          <Button type="submit" loading={pending}>
            Save profile
          </Button>
        }
      >
        <div className="grid max-w-lg gap-4">
          <FormField label="Full name" error={state?.fields?.name}>
            <Input name="name" defaultValue={name} autoComplete="name" className={CONTROL} />
          </FormField>
          <FormField label="Email" hint={isGuest ? "Demo guests don't have an email login. Create an account to add one." : "Your sign-in email. Contact support to change it."}>
            <Input value={isGuest ? "Demo guest" : email} readOnly disabled className={CONTROL} />
          </FormField>
        </div>
      </Panel>
    </form>
  );
}

export function BusinessForm({ name, currency, timezone }: { name: string; currency: string; timezone: string }) {
  const [state, action, pending] = useActionState(updateBusinessAction, undefined);
  const [zones, setZones] = useState<string[]>([timezone]);
  useSaved(state);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the full list is only known in the browser
    setZones(["UTC", ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC")]);
  }, []);

  return (
    <form action={action}>
      <Panel
        title="Business"
        description="Shown on your invoices and pay pages."
        footer={
          <Button type="submit" loading={pending}>
            Save business details
          </Button>
        }
      >
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <FormField label="Business name" error={state?.fields?.businessName} className="sm:col-span-2">
            <Input name="businessName" defaultValue={name} autoComplete="organization" className={CONTROL} />
          </FormField>
          <FormField label="Default currency" error={state?.fields?.currency}>
            <NativeSelect name="currency" defaultValue={currency} className={CONTROL}>
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Time zone" error={state?.fields?.timezone}>
            <NativeSelect name="timezone" defaultValue={timezone} key={zones.length} className={CONTROL}>
              {(zones.includes(timezone) ? zones : [timezone, ...zones]).map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </Panel>
    </form>
  );
}

export function PasswordForm({ hasPassword, isGuest }: { hasPassword: boolean; isGuest: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const [key, setKey] = useState(0);
  useSaved(state);
  // Clear the fields after a successful change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the form after the server confirmed
    if (state?.ok) setKey((value) => value + 1);
  }, [state]);

  if (isGuest) {
    return (
      <Panel title="Password">
        <p className="text-[13px] text-muted-foreground">Demo guests sign in with a temporary session. Create an account to set a password.</p>
      </Panel>
    );
  }

  return (
    <form action={action} key={key}>
      <Panel
        title={hasPassword ? "Change password" : "Set a password"}
        description="Changing it signs you out on every other device."
        footer={
          <Button type="submit" loading={pending}>
            {hasPassword ? "Change password" : "Set password"}
          </Button>
        }
      >
        {state?.error ? <Banner tone="danger" className="mb-4">{state.error}</Banner> : null}
        <div className="grid max-w-lg gap-4">
          {hasPassword ? (
            <FormField label="Current password" error={state?.fields?.current}>
              <PasswordInput name="current" autoComplete="current-password" className={CONTROL} />
            </FormField>
          ) : null}
          <FormField label="New password" error={state?.fields?.password}>
            <PasswordInput name="password" autoComplete="new-password" meter className={CONTROL} />
          </FormField>
        </div>
      </Panel>
    </form>
  );
}

/** Dates arrive already formatted on the server, in the workspace time zone, so server and browser render the same text. */
type SessionRow = { id: string; userAgent: string | null; signedIn: string; lastActive: string };

function describeDevice(agent: string | null) {
  if (!agent) return { label: "Unknown device", phone: false };
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const system = /Windows/.test(agent) ? "Windows" : /iPhone|iPad/.test(agent) ? "iOS" : /Android/.test(agent) ? "Android" : /Mac OS X/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "";
  return { label: system ? `${browser} on ${system}` : browser, phone: /Mobile|iPhone|Android/.test(agent) };
}

export function SessionsPanel({ sessions, currentId }: { sessions: SessionRow[]; currentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const others = sessions.filter((session) => session.id !== currentId).length;

  return (
    <Panel
      title="Active sessions"
      description="Browsers where you're signed in."
      footer={
        <Button
          variant="outline"
          disabled={others === 0}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const { count } = await signOutOtherSessionsAction();
              toast.success(count === 1 ? "Signed out 1 other session." : `Signed out ${count} other sessions.`);
              router.refresh();
            })
          }
        >
          <LogOut aria-hidden />
          Sign out other sessions
        </Button>
      }
    >
      <ul className="divide-y text-[13px]">
        {sessions.map((session) => {
          const device = describeDevice(session.userAgent);
          const Icon = device.phone ? Smartphone : Laptop;
          return (
            <li key={session.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {device.label}
                  {session.id === currentId ? <span className="ml-2 rounded bg-success-soft px-1.5 py-px text-[11px] font-medium text-success">This device</span> : null}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Signed in {session.signedIn} · last active {session.lastActive}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function WorkspaceDanger({ email, isGuest }: { email: string; isGuest: boolean }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <Panel title="Sample data" description="Replace everything in this workspace with fresh sample data, marked Demo.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[52ch] text-[13px] text-muted-foreground">
            Deletes all clients, invoices, payments and conversations in this workspace, then loads the sample set again. Your account and settings stay.
          </p>
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <RefreshCcw aria-hidden />
                Reset demo data
              </Button>
            }
            title="Reset this workspace?"
            description="Every client, invoice, payment and conversation here is deleted and replaced with sample data. This can't be undone."
            confirmLabel="Reset workspace"
            destructive
            onConfirm={async () => {
              await resetDemoDataAction();
              toast.success("Workspace reset with fresh sample data.");
              router.refresh();
            }}
          />
        </div>
      </Panel>

      <section className="rounded-xl border border-danger/30 bg-card shadow-raised">
        <header className="border-b border-danger/20 px-5 py-4">
          <h2 className="text-sm font-semibold text-danger">Delete account</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Permanently remove your account, your workspace and everything in it.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="max-w-[52ch] text-[13px] text-muted-foreground">PayPal sandbox records stay with PayPal; Orbyn&rsquo;s copies are deleted.</p>
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <Trash2 aria-hidden />
                Delete account
              </Button>
            }
            title="Delete your account?"
            description="Your account, workspace, clients, invoices, payments and conversations are deleted for good."
            confirmLabel="Delete everything"
            confirmText={isGuest ? "delete" : email}
            destructive
            onConfirm={() => deleteAccountAction(isGuest ? email : (document.getElementById("confirm-text") as HTMLInputElement | null)?.value ?? "")}
          />
        </div>
      </section>
    </div>
  );
}
