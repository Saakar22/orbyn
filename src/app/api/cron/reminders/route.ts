import { createHash, timingSafeEqual } from "node:crypto";
import { runReminderSweep } from "@/server/services/reminders";

// Called by the scheduler (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runReminderSweep();
  return Response.json({ ok: true, ...result });
}
