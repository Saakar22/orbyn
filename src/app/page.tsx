import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { NavCta, NavLogin } from "@/components/landing/account-links";
import { BuilderNote } from "@/components/landing/builder-note";
import { Closing, Footer } from "@/components/landing/closing";
import { Hero } from "@/components/landing/hero";
import { Playground } from "@/components/landing/playground";
import { SignedOutToast } from "@/components/landing/signed-out-toast";
import { SiteNav } from "@/components/landing/site-nav";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Statement } from "@/components/landing/statement";
import { Story } from "@/components/landing/story";
import { Trust } from "@/components/landing/trust";
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
      <SiteNav login={<NavLogin />} cta={<NavCta />} />
      <Suspense>
        <SignedOutToast />
      </Suspense>
      <Hero />
      <main>
        <Statement />
        <Story />
        <Playground />
        <Trust />
        <BuilderNote />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
