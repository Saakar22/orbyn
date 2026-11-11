"use client";

import { useRef } from "react";
import { StatusBadge } from "@/components/status-badge";
import { DESKTOP, MOTION_OK, useScrollMotion, type MotionTools } from "./motion";
import { ApprovalBar, CardHeader, ChatBubble, PlanFields, Receipt, STEPS, Thinking } from "./story-parts";

const two = (n: number) => String(n + 1).padStart(2, "0");

/** Scroll progress (0..1) at which each step becomes the active one. */
const STEP_AT = [0, 0.27, 0.55, 0.8];

/**
 * One timeline, scrubbed by scroll, morphs a single card through the four stages:
 * thinking pill -> plan -> plan + approval (button pressed) -> verified receipt.
 * Heights tween to "auto", so the card genuinely grows and shrinks rather than crossfading.
 */
function setup({ gsap }: MotionTools, scope: HTMLElement) {
  const q = gsap.utils.selector(scope);
  const steps = q("[data-step]");
  const progressBar = q("[data-progress]");
  let active = -1;

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: q("[data-pin]")[0],
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        gsap.set(progressBar, { scaleY: self.progress });
        const next = STEP_AT.reduce((found, at, i) => (self.progress >= at ? i : found), 0);
        if (next === active) return;
        active = next;
        steps.forEach((step, i) => step.toggleAttribute("data-active", i === next));
      },
    },
  });

  const collapsed = { height: 0, opacity: 0 };
  gsap.set(q("[data-block='header'], [data-block='fields'], [data-block='approval'], [data-block='receipt']"), collapsed);
  gsap.set(q("[data-field]"), { opacity: 0, y: 10 });
  gsap.set(q("[data-badge='PENDING'], [data-badge='PAID']"), { opacity: 0 });
  gsap.set(q("[data-approve-done]"), { opacity: 0 });
  gsap.set(q("[data-check]"), { strokeDasharray: 1, strokeDashoffset: 1 });

  tl.addLabel("say", 0)
    // 01 -> 02: the thinking pill gives way to the plan.
    .to(q("[data-block='thinking']"), { ...collapsed, duration: 0.35 }, 0.45)
    .to(q("[data-bubble]"), { opacity: 0.72, duration: 0.4 }, 0.45)
    .to(q("[data-block='header']"), { height: "auto", opacity: 1, duration: 0.35 }, 0.5)
    .to(q("[data-block='fields']"), { height: "auto", opacity: 1, duration: 0.5 }, 0.6)
    .to(q("[data-field]"), { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: "power2.out" }, 0.75)
    // 02 -> 03: the approval bar slides out from under the plan, then the button is pressed.
    .to(q("[data-block='approval']"), { height: "auto", opacity: 1, duration: 0.45 }, 1.65)
    .to(q("[data-approve]"), { scale: 0.94, duration: 0.12, ease: "power2.in" }, 2.3)
    .to(q("[data-approve]"), { scale: 1, backgroundColor: "#15131f", duration: 0.18, ease: "power2.out" }, 2.42)
    .to(q("[data-approve-idle]"), { opacity: 0, duration: 0.12 }, 2.36)
    .to(q("[data-approve-done]"), { opacity: 1, duration: 0.15 }, 2.44)
    .to(q("[data-badge='DRAFT']"), { opacity: 0, duration: 0.15 }, 2.5)
    .to(q("[data-badge='PENDING']"), { opacity: 1, duration: 0.15 }, 2.55)
    // 03 -> 04: the plan folds away and the receipt takes its place.
    .to(q("[data-block='fields'], [data-block='approval']"), { ...collapsed, duration: 0.5 }, 3.15)
    .to(q("[data-block='receipt']"), { height: "auto", opacity: 1, duration: 0.5 }, 3.3)
    .to(q("[data-badge='PENDING']"), { opacity: 0, duration: 0.15 }, 3.4)
    .to(q("[data-badge='PAID']"), { opacity: 1, duration: 0.15 }, 3.45)
    .to(q("[data-check]"), { strokeDashoffset: 0, duration: 0.35, ease: "power1.out" }, 3.7)
    // Hold on the receipt before the section releases.
    .to({}, { duration: 0.5 }, 4.1);
}

export function Story() {
  const ref = useRef<HTMLElement>(null);
  useScrollMotion(ref, setup, `${MOTION_OK} and ${DESKTOP}`);

  return (
    <section id="story" ref={ref} className="story">
      <div className="grid-12">
        <h2 className="font-display col-span-12 text-[length:var(--step-display)] md:col-span-9">
          One instruction, followed all the way to the money.
        </h2>
      </div>

      {/* Desktop with motion: a pinned stage where one card morphs as you scroll. */}
      <div className="story-pin" data-pin>
        <div className="story-stage grid-12">
          <div className="story-rail col-span-4">
            <span className="story-progress" aria-hidden>
              <span data-progress />
            </span>
            <ol className="story-steps">
              {STEPS.map((step, i) => (
                <li key={step.title} data-step data-active={i === 0 || undefined}>
                  <span className="story-step-num tabular">{two(i)}</span>
                  <div>
                    <h3 className="font-display">{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="story-scene col-span-7 col-start-6">
            <div data-bubble>
              <ChatBubble />
            </div>
            <article className="story-card" aria-label="How one request moves through Orbyn">
              <div data-block="thinking">
                <Thinking />
              </div>
              <div data-block="header">
                <CardHeader>
                  <span className="story-badges">
                    {["DRAFT", "PENDING", "PAID"].map((status) => (
                      <span key={status} data-badge={status}>
                        <StatusBadge status={status} />
                      </span>
                    ))}
                  </span>
                </CardHeader>
              </div>
              <div data-block="fields">
                <PlanFields />
              </div>
              <div data-block="approval">
                <ApprovalBar />
              </div>
              <div data-block="receipt">
                <Receipt />
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* Phones and reduced motion: the same four stages as a plain stacked list. */}
      <ol className="story-stack grid-12">
        {STEPS.map((step, i) => (
          <li key={step.title} className="col-span-12">
            <div className="story-stack-label">
              <span className="story-step-num tabular">{two(i)}</span>
              <div>
                <h3 className="font-display">{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
            <div className="story-stack-card">
              {i === 0 ? <ChatBubble /> : null}
              {i === 1 ? (
                <article className="story-card">
                  <CardHeader status="DRAFT" />
                  <PlanFields />
                </article>
              ) : null}
              {i === 2 ? (
                <article className="story-card">
                  <CardHeader status="PENDING" />
                  <ApprovalBar pressed />
                </article>
              ) : null}
              {i === 3 ? (
                <article className="story-card">
                  <CardHeader status="PAID" />
                  <Receipt />
                </article>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
