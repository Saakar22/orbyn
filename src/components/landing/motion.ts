"use client";

import { useEffect, type RefObject } from "react";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export type MotionTools = { gsap: Gsap; ScrollTrigger: ScrollTriggerStatic };

/** Media queries the landing page branches on. Pinning and scrubbing need both. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const DESKTOP = "(min-width: 768px)";

let loading: Promise<MotionTools> | null = null;

/** GSAP is loaded once, on demand, so it never sits in the initial bundle. */
export function loadMotion(): Promise<MotionTools> {
  loading ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  });
  return loading;
}

/**
 * Run scroll-driven animation for a section, only when the visitor allows motion.
 * `setup` runs inside a GSAP context scoped to `scope`, so everything it creates is reverted on
 * unmount or when the media query stops matching. With reduced motion it never runs, and the
 * section stays in its static, fully readable CSS state.
 */
export function useScrollMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (tools: MotionTools, scopeEl: HTMLElement) => void,
  query: string = MOTION_OK,
) {
  useEffect(() => {
    const el = scope.current;
    // Reduced motion never loads GSAP. Other conditions (e.g. desktop width) are watched live by
    // gsap.matchMedia below, so resizing across a breakpoint sets up or reverts the animation.
    if (!el || !window.matchMedia(MOTION_OK).matches) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    loadMotion().then((tools) => {
      if (cancelled) return;
      const mm = tools.gsap.matchMedia(el);
      mm.add(query, () => setup(tools, el));
      revert = () => mm.revert();
    });

    return () => {
      cancelled = true;
      revert?.();
    };
    // setup is intentionally read once per mount; sections pass stable module-level functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, query]);
}
