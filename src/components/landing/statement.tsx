"use client";

import { useRef } from "react";
import { useScrollMotion, type MotionTools } from "./motion";

const LINES = ["Say it.", "Review it.", "Approve it.", "Get paid."];

/** Words start faint and turn to ink as the section scrolls through the viewport. */
function setup({ gsap }: MotionTools, scope: HTMLElement) {
  const words = scope.querySelectorAll<HTMLElement>("[data-word]");
  const styles = getComputedStyle(scope);
  gsap.fromTo(
    words,
    { color: styles.getPropertyValue("--ink-faint").trim() },
    {
      color: styles.getPropertyValue("--ink").trim(),
      ease: "none",
      stagger: 0.6,
      scrollTrigger: { trigger: scope, start: "top 72%", end: "bottom 62%", scrub: 0.4 },
    },
  );
}

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  useScrollMotion(ref, setup);

  return (
    <section id="statement" ref={ref} className="statement">
      <div className="grid-12">
        {/* Without motion (or before the script loads) the text is simply ink: the final state. */}
        <h2 className="font-display col-span-12">
          {LINES.map((line, i) => (
            <span key={line} className="statement-line" data-line={i}>
              {line.split(" ").map((word, j) => (
                <span key={j} data-word>
                  {word}
                  {j === 0 ? " " : ""}
                </span>
              ))}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
