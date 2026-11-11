"use client";

import { useEffect, useRef } from "react";
import { startDemo } from "@/app/actions/auth";
import { StartDemoButton } from "./start-demo-button";

const LINKS = [
  { href: "#story", label: "How it works" },
  { href: "#playground", label: "Try it" },
];

/**
 * Fixed navigation. The links and wordmark are white with a difference blend (see landing.css),
 * so they read light over the night scenes and dark over paper without any scroll logic.
 * The demo button sits in its own fixed layer so it keeps its real colours.
 */
export function SiteNav() {
  const ref = useRef<HTMLElement>(null);

  // Mark the link of the section currently being read.
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    let frame = 0;

    const read = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let active = "";
      for (const { href } of LINKS) {
        const section = document.querySelector(href);
        if (section && section.getBoundingClientRect().top <= middle) active = href;
      }
      for (const link of nav.querySelectorAll("a[data-link]")) {
        link.toggleAttribute("data-active", link.getAttribute("href") === active);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <>
      <nav ref={ref} aria-label="Primary" className="site-nav hero-fade">
        <div className="site-nav-links">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="site-nav-link" data-link>
              {label}
            </a>
          ))}
        </div>
        <a href="#top" className="site-nav-brand font-display" aria-label="Orbyn, back to top">
          Orbyn
        </a>
      </nav>
      <form action={startDemo} className="site-nav-cta hero-fade">
        <StartDemoButton size="nav" label="Live demo" />
      </form>
    </>
  );
}
