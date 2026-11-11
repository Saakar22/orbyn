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
import { instrumentSerif } from "@/lib/fonts";
import "./landing.css";


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
