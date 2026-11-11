"use client";

import { useId, useState } from "react";
import { previewIntent, SAMPLE_PROMPTS, type IntentPreview } from "@/lib/intent-preview";
import { formatMoney } from "@/lib/money";

const TITLES: Record<IntentPreview["action"], string> = {
  invoice: "Draft invoice",
  reminder: "Reminder draft",
  summary: "Financial summary",
  unknown: "Nothing recognised yet",
};

const NEXT_STEP: Record<IntentPreview["action"], string> = {
  invoice: "In the live demo, Orbyn saves this as a draft and waits for you to approve it before it is issued.",
  reminder: "In the live demo, Orbyn writes the reminder, shows it to you, and schedules it only after you approve.",
  summary: "In the live demo, Orbyn answers with figures from your invoices and payments, never from guesswork.",
  unknown: "Try asking for an invoice, a reminder, or a summary of what you are owed.",
};

function rows(preview: IntentPreview): { label: string; value: string | null; note?: string }[] {
  if (preview.action === "invoice") {
    return [
      { label: "Client", value: preview.client },
      { label: "Amount", value: preview.amountMinor === null ? null : formatMoney(preview.amountMinor) },
      { label: "For", value: preview.description },
      {
        label: "Due",
        value: preview.dueInDays === null ? null : `${preview.dueInDays} day${preview.dueInDays === 1 ? "" : "s"} after issue`,
        note: preview.dueIsDefault ? "Default, since none was given" : undefined,
      },
    ];
  }
  if (preview.action === "reminder") {
    return [
      { label: "Client", value: preview.client },
      { label: "Invoice", value: preview.invoiceRef },
    ];
  }
  return [];
}

export function Playground() {
  const inputId = useId();
  const [sample, setSample] = useState(0);
  const [text, setText] = useState(SAMPLE_PROMPTS[0]);
  const preview = previewIntent(text);
  const fields = rows(preview).filter((row) => row.value !== null || preview.action === "invoice");

  return (
    <section id="playground" className="playground">
      <div className="grid-12">
        <h2 className="font-display col-span-12 text-[length:var(--step-display)] md:col-span-8">Try an instruction.</h2>
        <p className="col-span-12 mt-5 max-w-[52ch] text-[length:var(--step-lead)] leading-relaxed text-[var(--ink-soft)] md:col-span-7">
          Type it the way you would say it. This preview runs entirely in your browser with a simple pattern matcher. The live
          demo uses an AI model and your real client list.
        </p>

        <div className="col-span-12 mt-12 md:col-span-7 md:mt-16">
          <label htmlFor={inputId} className="text-sm text-[var(--ink-soft)]">
            Your instruction
          </label>
          <textarea
            id={inputId}
            className="playground-input font-display"
            rows={2}
            maxLength={300}
            spellCheck={false}
            value={text}
            placeholder="Invoice Alex $500 for website development"
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="button"
            className="playground-example"
            onClick={() => {
              const next = (sample + 1) % SAMPLE_PROMPTS.length;
              setSample(next);
              setText(SAMPLE_PROMPTS[next]);
            }}
          >
            Generate example
          </button>
        </div>

        <div className="col-span-12 mt-10 md:col-span-5 md:mt-16" aria-live="polite">
          <article className="story-card" aria-label="Preview of what Orbyn would prepare">
            <div className="story-card-header">
              <span className="font-medium">{TITLES[preview.action]}</span>
              <span className="playground-tag">Preview</span>
            </div>

            {fields.length ? (
              <dl className="story-fields">
                {fields.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd data-empty={row.value === null || undefined}>
                      {row.value ?? "Not given"}
                      {row.note ? <span>{row.note}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {preview.missing.length ? (
              <div className="playground-ask">
                <p className="font-medium">Orbyn would ask</p>
                <ul>
                  {preview.missing.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="playground-next">{text.trim() ? NEXT_STEP[preview.action] : "Start typing, or generate an example."}</p>
          </article>
          <p className="mt-3 text-[13px] text-[var(--ink-soft)]">Nothing you type here is sent or saved.</p>
        </div>
      </div>
    </section>
  );
}
