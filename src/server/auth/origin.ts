// CSRF guard for cookie-authenticated route handlers. Server Actions get the same check from
// Next.js itself; plain POST routes have to do it by hand.

/**
 * True when a state-changing request was sent by this site's own pages. Browsers always attach
 * Origin to cross-site POSTs, so a missing or foreign Origin is refused.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
