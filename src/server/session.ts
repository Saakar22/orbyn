import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/server/db";

export const SESSION_COOKIE = "orbyn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  if (Number(expires) < Date.now() / 1000) return null;
  return userId;
}

export async function setSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // Checking expiry reads the clock, so this must run at request time, never in a prerender/prefetch pass.
  await connection();
  return decodeSession(token);
}

/** The signed-in person and the workspace they own, or null. */
export async function getAuthContext() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true } });
  if (!user?.workspace) return null;
  const { workspace, ...person } = user;
  return { user: person, workspace };
}

/** For pages: the signed-in person and the workspace they own. Redirects to the landing page without a session. */
export async function requireWorkspace() {
  const context = await getAuthContext();
  if (!context) redirect("/");
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
