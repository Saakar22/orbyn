"use client";

import { useEffect } from "react";
import { loadMotion, MOTION_OK } from "./motion";

/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Starts when the browser is idle, and not at all for visitors who prefer reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;

    let cancelled = false;
    let stop: (() => void) | undefined;

    const start = async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import("lenis"), loadMotion()]);
      if (cancelled) return;

      const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.11 });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      stop = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    };

    const idle = window.requestIdleCallback?.(() => void start(), { timeout: 1500 }) ?? window.setTimeout(() => void start(), 300);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      stop?.();
    };
  }, []);

  return null;
}
