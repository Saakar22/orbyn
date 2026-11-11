"use client";

import { useRef } from "react";
import { DESKTOP, useScrollMotion, type MotionTools } from "./motion";

const LINES = ["Say it.", "Review it.", "Approve it.", "Get paid."];
const PHONE = "(max-width: 767.98px)";

const inks = (scope: HTMLElement) => {
  const styles = getComputedStyle(scope);
  return { faint: styles.getPropertyValue("--ink-faint").trim(), ink: styles.getPropertyValue("--ink").trim() };
};

/**
 * Desktop: the section is pinned over the end of the hero takeover, so each line rises into
 * place on the freshly revealed paper, faint at first and then turning to ink.
 */
function setupPinned({ gsap }: MotionTools, scope: HTMLElement) {
  const { faint, ink } = inks(scope);
  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: scope, start: "top 25%", end: "bottom bottom", scrub: 0.5 },
  });
  scope.querySelectorAll<HTMLElement>("[data-line]").forEach((line, i) => {
    const words = line.querySelectorAll("[data-word]");
    timeline
      .fromTo(words, { yPercent: 115, color: faint }, { yPercent: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, i)
      .to(words, { color: ink, duration: 0.45, stagger: 0.12 }, i + 0.45);
  });
  timeline.to({}, { duration: 1 });
}

/** Phones: no pinning. Words start faint and turn to ink as the section scrolls through. */
function setupFlow({ gsap }: MotionTools, scope: HTMLElement) {
  const { faint, ink } = inks(scope);
  gsap.fromTo(
    scope.querySelectorAll("[data-word]"),
    { color: faint },
    { color: ink, ease: "none", stagger: 0.6, scrollTrigger: { trigger: scope, start: "top 72%", end: "bottom 62%", scrub: 0.4 } },
  );
}

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  useScrollMotion(ref, setupPinned, DESKTOP);
  useScrollMotion(ref, setupFlow, PHONE);

  return (
    <section id="statement" ref={ref} className="statement">
      <div className="statement-stage grid-12">
        {/* Without motion (or before the script loads) the text is simply ink: the final state. */}
        <h2 className="font-display col-span-12">
          {LINES.map((line, i) => (
            <span key={line} className="statement-line" data-line={i}>
              {line.split(" ").map((word, j) => (
                <span key={j} data-word>
                  {word}
                </span>
              ))}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
