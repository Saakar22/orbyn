import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";
import { loginSchema } from "@/lib/auth-schemas";
import { accountForGoogle, verifyCredentials } from "@/server/auth/accounts";
import { clearRateLimit, clientAddress, LIMITS, rateLimit } from "@/server/auth/rate-limit";
import { db } from "@/server/db";
import { createDemoUser } from "@/server/seed/demoWorkspace";

const DAY_SECONDS = 86_400;
/** How long a browser stays signed in, by how it signed in. Enforced on the Session row, server-side. */
const LIFETIME_DAYS = { remembered: 30, standard: 1, guest: 14 } as const;

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function authSecret() {
  const value = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET (or AUTH_SECRET) must be set to 32+ random characters");
  return value;
}

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

type SignedInUser = { id: string; name: string; email: string; lifetimeDays: number };

declare module "next-auth" {
  interface Session {
    /** Id of the Session row behind this browser. Deleting the row signs the browser out. */
    sid?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: { strategy: "jwt", maxAge: LIFETIME_DAYS.remembered * DAY_SECONDS },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      credentials: { email: {}, password: {}, remember: {} },
      async authorize(raw): Promise<SignedInUser | null> {
        const parsed = loginSchema.safeParse({ email: raw.email, password: raw.password, remember: raw.remember === "true" || raw.remember === true });
        if (!parsed.success) return null;
        const { email, password, remember } = parsed.data;

        const address = await clientAddress();
        const accountKey = `login:${address}:${email}`;
        const [perAccount, perAddress] = await Promise.all([
          rateLimit(accountKey, LIMITS.loginPerAccount.limit, LIMITS.loginPerAccount.windowSeconds),
          rateLimit(`login:${address}`, LIMITS.loginPerAddress.limit, LIMITS.loginPerAddress.windowSeconds),
        ]);
        if (!perAccount.ok || !perAddress.ok) throw new RateLimited();

        const user = await verifyCredentials(email, password);
        if (!user) return null;
        await clearRateLimit(accountKey);
        return { id: user.id, name: user.name, email: user.email, lifetimeDays: remember ? LIFETIME_DAYS.remembered : LIFETIME_DAYS.standard };
      },
    }),
    // "Try the live demo": no credentials. Each sign-in gets its own guest and seeded workspace.
    Credentials({
      id: "demo",
      credentials: {},
      async authorize(): Promise<SignedInUser | null> {
        const limit = await rateLimit(`demo:${await clientAddress()}`, LIMITS.demoPerAddress.limit, LIMITS.demoPerAddress.windowSeconds);
        if (!limit.ok) throw new RateLimited();
        const user = await createDemoUser(db);
        return { id: user.id, name: user.name, email: user.email, lifetimeDays: LIFETIME_DAYS.guest };
      },
    }),
    ...(googleEnabled ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })] : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // Only accept Google identities whose email Google has verified, since accounts link by email.
      if (account?.provider === "google") return Boolean(profile?.email && profile.email_verified);
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // `user` is only present on the request that signs someone in.
      if (!user) return token;

      let userId = user.id!;
      let lifetimeDays: number = (user as Partial<SignedInUser>).lifetimeDays ?? LIFETIME_DAYS.standard;
      if (account?.provider === "google") {
        const linked = await accountForGoogle({ sub: profile!.sub!, email: profile!.email!, name: profile!.name });
        userId = linked.id;
        lifetimeDays = LIFETIME_DAYS.remembered;
      }

      const session = await db.session.create({
        data: {
          userId,
          userAgent: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
          expiresAt: new Date(Date.now() + lifetimeDays * DAY_SECONDS * 1000),
        },
      });
      // Keep the cookie small and free of personal details: just the two ids.
      return { sub: userId, sid: session.id };
    },
    session({ session, token }) {
      session.sid = typeof token.sid === "string" ? token.sid : undefined;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const sid = "token" in message ? message.token?.sid : undefined;
      if (typeof sid === "string") await db.session.deleteMany({ where: { id: sid } });
    },
  },
  logger: {
    error(error) {
      // Wrong passwords are expected; don't fill the log with stack traces for them.
      if (error instanceof CredentialsSignin) return;
      console.error("[auth]", error);
    },
  },
});
