import { startDemo } from "@/app/actions/auth";
import Link from "next/link";
import { PillLink } from "./pill";
import { StartDemoButton } from "./start-demo-button";

export function Closing() {
  return (
    <section id="start" className="closing">
      <div className="closing-orb" aria-hidden />
      <div className="grid-12">
        <h2 className="font-display col-span-12">Start with Orbyn</h2>
        <div className="col-span-12 mt-10 flex flex-wrap items-center justify-center gap-3 md:mt-14">
          <PillLink href="/signup" size="closing">
            Create account
          </PillLink>
          <form action={startDemo}>
            <StartDemoButton size="closing" tone="ghost" />
          </form>
        </div>
        <p className="closing-note col-span-12">
          Free while Orbyn runs on the PayPal sandbox. The demo needs no sign-up, and nothing real is charged.
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="grid-12">
        <nav aria-label="Footer" className="col-span-12 flex flex-wrap gap-x-8 gap-y-2 md:col-span-7">
          <a href="#story" className="nav-link">
            How it works
          </a>
          <Link href="/login" className="nav-link">
            Log in
          </Link>
          <Link href="/signup" className="nav-link">
            Sign up
          </Link>
          {/* Placeholder: point this at the public repository once there is one. */}
          <a href="https://github.com" className="nav-link" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <p className="col-span-12 mt-4 md:col-span-5 md:mt-0 md:text-right">PayPal AI Hackathon · Sandbox build</p>
      </div>
      {/* Decorative wordmark stretched to the full width; the brand name is already in the page. */}
      <svg className="footer-wordmark font-display" viewBox="0 0 1000 232" preserveAspectRatio="none" aria-hidden>
        <text x="500" y="226" textAnchor="middle" textLength="988" lengthAdjust="spacingAndGlyphs">
          ORBYN
        </text>
      </svg>
    </footer>
  );
}
