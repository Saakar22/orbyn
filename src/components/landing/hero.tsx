import type { CSSProperties } from "react";
import { startDemo } from "@/app/actions/auth";
import { OrbynMark } from "@/components/brand/orbyn-mark";
import { StartDemoButton } from "./start-demo-button";

const LETTERS = ["O", "R", "B", "Y", "N"];
const HEADLINE = ["From financial intent", "to intelligent execution."];

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

/** Load-in is pure CSS (see landing.css), so there is no flash before JavaScript and nothing to wait for. */
export function Hero() {
  return (
    <header className="hero">
      <nav aria-label="Primary" className="grid-12 hero-fade items-center pt-5 md:pt-7" style={delay(0)}>
        <a href="#top" className="col-span-3 flex items-center gap-2.5 justify-self-start" aria-label="Orbyn, back to top">
          <OrbynMark className="size-7" />
        </a>
        <div className="col-span-9 flex items-center justify-end gap-5 text-sm md:gap-9">
          <a href="#story" className="nav-link hidden sm:inline">
            How it works
          </a>
          <a href="#playground" className="nav-link hidden sm:inline">
            Try it
          </a>
          <form action={startDemo}>
            <StartDemoButton size="nav" label="Live demo" />
          </form>
        </div>
      </nav>

      <div className="grid-12 flex-1 content-center py-10">
        <p className="wordmark font-display col-span-12" role="img" aria-label="Orbyn">
          {LETTERS.map((letter, i) => (
            <span key={letter} className="letter" aria-hidden>
              <span className="mask">
                <span style={delay(i)}>{letter}</span>
              </span>
              {/* The logo's satellite, orbiting the O. Sits outside the mask so it isn't clipped. */}
              {i === 0 ? (
                <span className="orbit hero-fade" style={delay(10)}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <ellipse cx="50" cy="50" rx="49.5" ry="49.5" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <span className="satellite" />
                </span>
              ) : null}
            </span>
          ))}
        </p>

        <h1 id="top-headline" className="font-display col-span-12 mt-8 text-[length:var(--step-headline)] md:col-span-8 md:mt-12">
          {HEADLINE.map((line, i) => (
            <span key={line} className="mask">
              <span style={delay(i + 5)}>{line}</span>
            </span>
          ))}
        </h1>

        <div className="hero-fade col-span-12 mt-8 md:col-span-4 md:col-start-9 md:mt-12 md:self-end" style={delay(9)}>
          <p className="max-w-[34ch] text-[length:var(--step-lead)] leading-relaxed text-[var(--ink-soft)]">
            Tell Orbyn what you need in plain words. It drafts the invoice, waits for your approval, and marks it paid only
            when PayPal confirms the money arrived.
          </p>
          <form action={startDemo} className="mt-7">
            <StartDemoButton size="hero" />
            <p className="mt-3 text-[13px] text-[var(--ink-soft)]">A private workspace with labelled demo data. No sign-up.</p>
          </form>
        </div>
      </div>

      <div className="grid-12 hero-fade pb-7" style={delay(12)}>
        <a href="#statement" className="scroll-cue col-span-12 justify-self-start text-[13px] text-[var(--ink-soft)]">
          <span className="scroll-cue-line" aria-hidden />
          Scroll to discover
        </a>
      </div>
    </header>
  );
}
