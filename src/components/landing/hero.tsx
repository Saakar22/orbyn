"use client";

import { useRef, type CSSProperties } from "react";
import { startDemo } from "@/app/actions/auth";
import { DESKTOP, useScrollMotion, type MotionTools } from "./motion";
import { PillLink } from "./pill";
import { StartDemoButton } from "./start-demo-button";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

/** The ring is drawn twice, behind and in front of the orb, so the satellite passes around it. */
const RING = "M 8,100 A 92,24 0 0 0 192,100 A 92,24 0 0 0 8,100";
const RING_FRONT = "M 8,100 A 92,24 0 0 0 192,100";
const ORBIT_SECONDS = "18s";

function Satellite({ visibleHalf }: { visibleHalf: "front" | "back" }) {
  return (
    <circle r="2.2" fill="currentColor" className="hero-satellite">
      <animateMotion dur={ORBIT_SECONDS} repeatCount="indefinite" path={RING} />
      <animate
        attributeName="opacity"
        dur={ORBIT_SECONDS}
        repeatCount="indefinite"
        calcMode="discrete"
        keyTimes="0;0.5"
        values={visibleHalf === "front" ? "1;0" : "0;1"}
      />
    </circle>
  );
}

/**
 * Scroll takeover (desktop, motion allowed): the stage is pinned while the orb grows until it
 * fills the screen, which turns the night scene into the paper the rest of the page sits on.
 */
function setup({ gsap }: MotionTools, hero: HTMLElement) {
  const q = gsap.utils.selector(hero);
  const stage = q(".hero-stage")[0] as HTMLElement;
  const orb = q("[data-orb]")[0] as HTMLElement;

  const cover = () => {
    const cx = stage.clientWidth / 2;
    const cy = orb.offsetTop + orb.offsetHeight / 2;
    const reach = Math.hypot(cx, Math.max(cy, stage.clientHeight - cy));
    return ((2 * reach) / orb.offsetWidth) * 1.5;
  };

  gsap
    .timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })
    .to(q("[data-word]"), { yPercent: -14, autoAlpha: 0, duration: 0.3 }, 0)
    .to(q("[data-copy]"), { y: -40, autoAlpha: 0, duration: 0.18 }, 0)
    .to(q("[data-cue]"), { autoAlpha: 0, duration: 0.08 }, 0)
    .to(q("[data-ring]"), { autoAlpha: 0, duration: 0.2 }, 0.04)
    .to(q("[data-ground]"), { yPercent: 115, duration: 0.42, ease: "power1.in" }, 0.04)
    .to(orb, { scale: cover, duration: 0.76, ease: "power2.in" }, 0.08)
    .to(q("[data-wash]"), { autoAlpha: 1, duration: 0.16 }, 0.74)
    .to({}, { duration: 0.08 });
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useScrollMotion(ref, setup, DESKTOP);

  return (
    <header ref={ref} className="hero">
      <div className="hero-stage">
        <div className="hero-sky" aria-hidden />

        {/* The wordmark is set twice: light on the sky, and dark where it crosses the orb. */}
        <div className="hero-word-layer" data-word aria-hidden>
          <p className="hero-word font-display">Orbyn</p>
        </div>

        <div className="hero-orb-in" aria-hidden>
          <svg className="hero-ring" data-ring viewBox="0 0 200 200">
            <g transform="rotate(-16 100 100)">
              <path d={RING} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <Satellite visibleHalf="back" />
            </g>
          </svg>
          <div className="hero-glow" data-ring />
          <div className="hero-orb" data-orb />
        </div>

        <div className="hero-word-layer hero-word-layer-ink" data-word aria-hidden>
          <p className="hero-word font-display">Orbyn</p>
        </div>

        <svg className="hero-ring hero-fade" style={delay(6)} data-ring viewBox="0 0 200 200" aria-hidden>
          <g transform="rotate(-16 100 100)">
            <path d={RING_FRONT} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <Satellite visibleHalf="front" />
          </g>
        </svg>

        <div className="hero-ground" data-ground aria-hidden />

        <div className="hero-copy grid-12" data-copy>
          <h1 className="font-display hero-fade col-span-12 md:col-span-6" style={delay(8)}>
            From financial intent to intelligent execution.
          </h1>
          <div className="hero-fade col-span-12 mt-6 md:col-span-4 md:col-start-9 md:mt-0 md:self-end" style={delay(11)}>
            <p className="hero-lead">
              Tell Orbyn what you need in plain words. It drafts the invoice, waits for your approval, and marks it paid only
              when PayPal confirms the money arrived.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PillLink href="/signup" size="hero">
                Get started — it&rsquo;s free
              </PillLink>
              <form action={startDemo}>
                <StartDemoButton size="hero" tone="ghost" />
              </form>
            </div>
            <p className="hero-note">The demo opens a private workspace with labelled sample data. No sign-up.</p>
          </div>
        </div>

        <a href="#statement" className="hero-cue hero-fade" style={delay(14)} data-cue>
          Scroll to discover
          <span aria-hidden />
        </a>

        <div className="hero-wash" data-wash aria-hidden />
      </div>
    </header>
  );
}
