import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// A fast first gate for the signed-in area: no valid session cookie, no page. It only checks that
// the cookie is genuine. Whether the session is still live (not revoked or expired) is checked
// against the database by every page, action and route handler; see src/server/session.ts.

const SECURE_COOKIE = "__Secure-authjs.session-token";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.SESSION_SECRET,
    secureCookie: request.cookies.has(SECURE_COOKIE),
  }).catch(() => null);

  if (token?.sid) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/assistant/:path*", "/invoices/:path*", "/transactions/:path*", "/settings/:path*", "/onboarding/:path*"],
};
