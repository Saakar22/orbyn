import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db";

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Fixed-window counter kept in Postgres, so the limit holds across serverless instances.
 * One atomic statement: start a new window if the old one has ended, otherwise add one.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  return {
    ok: row.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000)),
  };
}

/** Forget a counter, e.g. after a successful login. */
export async function clearRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

/** Best-effort caller address. Behind a proxy the first forwarded hop is the client. */
export async function clientAddress() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

export function waitMessage(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes <= 1 ? "a minute" : `${minutes} minutes`}.`;
}

export const LIMITS = {
  loginPerAccount: { limit: 5, windowSeconds: 15 * 60 },
  loginPerAddress: { limit: 30, windowSeconds: 15 * 60 },
  signupPerAddress: { limit: 5, windowSeconds: 60 * 60 },
  resetPerAccount: { limit: 3, windowSeconds: 60 * 60 },
  resetPerAddress: { limit: 10, windowSeconds: 60 * 60 },
  demoPerAddress: { limit: 20, windowSeconds: 60 * 60 },
} as const;
