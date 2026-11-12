"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signOut } from "@/auth";
import { changePasswordSchema, fieldErrors } from "@/lib/auth-schemas";
import { businessSchema } from "@/lib/workspace-options";
import { AccountError, changePassword, deleteAccount, resetDemoData, revokeOtherSessions } from "@/server/auth/accounts";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit";
import { requireContext } from "@/server/session";

export type SettingsState = { error?: string; fields?: Record<string, string>; ok?: string } | undefined;

const profileSchema = z.object({ name: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long.") });

export async function updateProfileAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user } = await requireContext();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function updateBusinessAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, workspace } = await requireContext();
  const parsed = businessSchema.safeParse({ businessName: formData.get("businessName"), currency: formData.get("currency"), timezone: formData.get("timezone") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  await db.workspace.update({ where: { id: workspace.id }, data: { name: parsed.data.businessName, currency: parsed.data.currency, timezone: parsed.data.timezone } });
  await audit({ workspaceId: workspace.id, userId: user.id, actor: "user", action: "workspace.updated", entityType: "Workspace", entityId: workspace.id });
  revalidatePath("/", "layout");
  return { ok: "Business details saved. New invoices use the new currency; existing ones keep theirs." };
}

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { user, sessionId } = await requireContext();
  const parsed = changePasswordSchema.safeParse({ current: formData.get("current") ?? "", password: formData.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  try {
    await changePassword(user.id, parsed.data.current, parsed.data.password, sessionId);
  } catch (error) {
    if (error instanceof AccountError) return error.code === "wrong_password" ? { fields: { current: error.message } } : { error: error.message };
    throw error;
  }
  revalidatePath("/settings");
  return { ok: "Password changed. Other devices were signed out." };
}

export async function signOutOtherSessionsAction() {
  const { user, sessionId } = await requireContext();
  const count = await revokeOtherSessions(user.id, sessionId);
  revalidatePath("/settings");
  return { count };
}

export async function resetDemoDataAction() {
  const { user, workspace } = await requireContext();
  await resetDemoData(workspace.id, user.id);
  revalidatePath("/", "layout");
}

export async function deleteAccountAction(confirmation: string) {
  const { user } = await requireContext();
  if (confirmation.trim().toLowerCase() !== user.email.toLowerCase()) return { error: "The email you typed doesn't match this account." };
  await deleteAccount(user.id);
  await signOut({ redirectTo: "/?notice=account-deleted" });
}
