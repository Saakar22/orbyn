import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

const TOUCH_AFTER_MS = 10 * 60_000;

/**
 * The signed-in person, the workspace they own and the id of this browser's session, or null.
 *
 * The Auth.js cookie only proves a session id was issued. The Session row is what makes it
 * valid, so signing out elsewhere, a password reset or expiry take effect on the next request.
 * Cached per request: layouts, pages and actions can all call it without repeating the lookup.
 */
export const getAuthContext = cache(async () => {
  // Expiry compares against the clock, so this must run at request time, never in a prerender pass.
  await connection();
  const sid = (await auth())?.sid;
  if (!sid) return null;

  const session = await db.session.findUnique({
    where: { id: sid },
    include: { user: { include: { workspace: true } } },
  });
  const now = Date.now();
  if (!session || session.expiresAt.getTime() <= now || !session.user.workspace) return null;

  if (now - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db.session.updateMany({ where: { id: sid }, data: { lastSeenAt: new Date(now) } });
  }

  // The password hash never leaves this module.
  const { workspace, passwordHash, ...user } = session.user;
  return { user: { ...user, hasPassword: Boolean(passwordHash) }, workspace, sessionId: sid };
});

export type AuthContext = NonNullable<Awaited<ReturnType<typeof getAuthContext>>>;

/**
 * For pages: the signed-in person and their workspace. Sends visitors to the login page, and
 * people who haven't finished setting up to onboarding.
 */
export async function requireWorkspace(options: { allowOnboarding?: boolean } = {}): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!context.user.onboardedAt && !options.allowOnboarding) redirect("/onboarding");
  return context;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** For actions and route handlers: the caller's workspace id, or throw. Every query is scoped by it. */
export async function requireWorkspaceId() {
  const context = await getAuthContext();
  if (!context) throw new UnauthorizedError();
  return context.workspace.id;
}

/** For actions that act on the account itself. */
export async function requireContext() {
  const context = await getAuthContext();
  if (!context) throw new UnauthorizedError();
  return context;
}
