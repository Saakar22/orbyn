"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors } from "@/lib/auth-schemas";
import { onboardingSchema } from "@/lib/workspace-options";
import { db } from "@/server/db";
import { seedDemoWorkspace } from "@/server/seed/demoWorkspace";
import { audit } from "@/server/services/audit";
import { requireContext } from "@/server/session";

export type OnboardingState = { error?: string; fields?: Record<string, string> } | undefined;

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { user, workspace } = await requireContext();
  if (user.onboardedAt) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    role: formData.get("role"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
    startWith: formData.get("startWith"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), error: "Check the highlighted answers and try again." };
  const { businessName, role, currency, timezone, startWith } = parsed.data;

  await db.workspace.update({ where: { id: workspace.id }, data: { name: businessName, currency, timezone } });

  // Sample data only goes into a workspace that has nothing in it, so a double submit can't seed twice.
  if (startWith === "sample" && (await db.invoice.count({ where: { workspaceId: workspace.id } })) === 0) {
    await seedDemoWorkspace(db, workspace.id, currency);
  }

  await db.user.update({ where: { id: user.id }, data: { role, onboardedAt: new Date() } });
  await audit({ workspaceId: workspace.id, userId: user.id, actor: "user", action: "onboarding.completed", entityType: "Workspace", entityId: workspace.id, metadata: { startWith } });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** The welcome tour is shown once per person; this records that they have seen it. */
export async function dismissTour() {
  const { user } = await requireContext();
  if (!user.tourDismissedAt) await db.user.update({ where: { id: user.id }, data: { tourDismissedAt: new Date() } });
}
