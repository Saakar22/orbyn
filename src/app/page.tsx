import { Instrument_Serif } from "next/font/google";
import { Hero } from "@/components/landing/hero";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import "./landing.css";

// Display face for the landing page only. next/font self-hosts it and generates a size-adjusted
// fallback, so the swap does not shift layout.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export default function Landing() {
  return (
    <div id="top" className={`landing ${instrumentSerif.variable}`}>
      <div className="grain" aria-hidden />
      <SmoothScroll />
      <Hero />
      <main>
        <section id="statement" aria-label="How Orbyn works, in four words" />
      </main>
    </div>
  );
}
