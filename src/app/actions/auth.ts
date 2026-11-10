"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { createDemoUser } from "@/server/seed/demoWorkspace";
import { clearSession, setSession } from "@/server/session";

/** One click: a fresh, seeded workspace per visitor so judges never collide. */
export async function startDemo() {
  const user = await createDemoUser(db);
  await setSession(user.id);
  redirect("/dashboard");
}

export async function signOut() {
  await clearSession();
  redirect("/");
}
