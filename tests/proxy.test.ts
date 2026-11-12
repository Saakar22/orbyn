import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const COOKIE = "authjs.session-token";
const secret = () => process.env.AUTH_SECRET || process.env.SESSION_SECRET || "";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie: `${COOKIE}=${cookie}` } } : undefined);
}

describe("route protection", () => {
  it("covers every signed-in area", () => {
    for (const area of ["dashboard", "assistant", "invoices", "transactions", "settings", "onboarding"]) {
      expect(config.matcher).toContain(`/${area}/:path*`);
    }
  });

  it("sends a signed-out visitor to the login page and remembers where they were going", async () => {
    const response = await proxy(request("/invoices/abc?tab=payments"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/invoices/abc?tab=payments");
  });

  it("rejects a cookie that was not issued by this server", async () => {
    const forged = await encode({ token: { sub: "user", sid: "session" }, secret: "x".repeat(40), salt: COOKIE });
    expect((await proxy(request("/dashboard", forged))).status).toBe(307);
    expect((await proxy(request("/dashboard", "garbage"))).status).toBe(307);
  });

  it.skipIf(secret().length < 32)("lets a genuine session cookie through", async () => {
    const genuine = await encode({ token: { sub: "user", sid: "session" }, secret: secret(), salt: COOKIE });
    const response = await proxy(request("/dashboard", genuine));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
