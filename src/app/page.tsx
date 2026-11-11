import { Instrument_Serif } from "next/font/google";
import { Hero } from "@/components/landing/hero";
import { Playground } from "@/components/landing/playground";
import { Story } from "@/components/landing/story";
import { Statement } from "@/components/landing/statement";
import { Trust } from "@/components/landing/trust";
import { BuilderNote } from "@/components/landing/builder-note";
import { Closing, Footer } from "@/components/landing/closing";
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
        <Statement />
        <Story />
        <Playground />
        <Trust />
        <BuilderNote />
        <Closing />
        <Footer />
      </main>
    </div>
  );
}
