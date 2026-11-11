import Link from "next/link";
import { Suspense } from "react";
import { getAuthContext } from "@/server/session";
import { PillLink } from "./pill";

// The landing page is prerendered. These two slots are the only parts that read the session:
// each streams in behind its own boundary, showing the signed-out version until it resolves.

function LoginLink() {
  return (
    <Link href="/login" className="site-nav-link site-nav-login">
      Log in
    </Link>
  );
}

function GetStarted() {
  return (
    <PillLink href="/signup" size="nav" outlined>
      Get started
    </PillLink>
  );
}

async function LoginForVisitor() {
  return (await getAuthContext()) ? null : <LoginLink />;
}

async function CtaForVisitor() {
  if (!(await getAuthContext())) return <GetStarted />;
  return (
    <PillLink href="/dashboard" size="nav" outlined>
      Open dashboard
    </PillLink>
  );
}

/** "Log in" for visitors; nothing once signed in. */
export function NavLogin() {
  return (
    <Suspense fallback={<LoginLink />}>
      <LoginForVisitor />
    </Suspense>
  );
}

/** "Get started" for visitors; "Open dashboard" once signed in. */
export function NavCta() {
  return (
    <Suspense fallback={<GetStarted />}>
      <CtaForVisitor />
    </Suspense>
  );
}
