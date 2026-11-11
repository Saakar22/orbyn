import { startDemo } from "@/app/actions/auth";
import { StartDemoButton } from "./start-demo-button";

export function Closing() {
  return (
    <section id="start" className="closing">
      <div className="grid-12">
        <h2 className="font-display col-span-12">Start with Orbyn</h2>
        <form action={startDemo} className="col-span-12 mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 md:mt-14">
          <StartDemoButton size="closing" label="Open the live demo" />
          <p className="max-w-[40ch] text-[15px] leading-relaxed text-[var(--ink-soft)]">
            One click creates a private workspace with labelled demo data. No sign-up, and nothing real is charged.
          </p>
        </form>
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
          <a href="#playground" className="nav-link">
            Try it
          </a>
          <a href="#trust" className="nav-link">
            Safeguards
          </a>
          <a href="#top" className="nav-link">
            Back to top
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
