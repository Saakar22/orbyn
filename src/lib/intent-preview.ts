// A deliberately small, regex-based reading of a typed instruction, used only by the landing
// page's "Preview" playground. It runs in the browser and never calls the server. The real
// assistant uses an AI model with tools; this just shows the shape of what it would prepare.

export type IntentAction = "invoice" | "reminder" | "summary" | "unknown";

export type IntentPreview = {
  action: IntentAction;
  client: string | null;
  amountMinor: number | null;
  description: string | null;
  /** Days until due. Invoices default to 14 when none is given (see dueIsDefault). */
  dueInDays: number | null;
  dueIsDefault: boolean;
  invoiceRef: string | null;
  /** Questions the assistant would ask before it could go further. */
  missing: string[];
};

const NOT_A_NAME = new Set([
  "a", "an", "the", "my", "me", "for", "about", "all", "every", "everyone", "client", "clients",
  "them", "him", "her", "us", "invoice", "invoices", "payment", "payments", "this", "that",
]);

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readAction(lower: string): IntentAction {
  if (/\b(remind|reminder|chase|nudge|follow up)\b/.test(lower)) return "reminder";
  if (/\b(invoice|bill|charge)\b/.test(lower)) return "invoice";
  if (/\b(summar\w*|how much|revenue|overdue|owes?|owed|report|cash ?flow|earned?)\b/.test(lower)) return "summary";
  return "unknown";
}

function readAmountMinor(text: string): number | null {
  const number = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(k)?`;
  const match =
    new RegExp(String.raw`\$\s?${number}`, "i").exec(text) ??
    new RegExp(String.raw`\b${number}\s?(?:dollars|usd|bucks)\b`, "i").exec(text) ??
    new RegExp(String.raw`\bfor\s+${number}\b(?!\s*(?:days?|hours?|weeks?|months?))`, "i").exec(text);
  if (!match) return null;
  const whole = Number(match[1].replaceAll(",", ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = (whole * 100 + cents) * (match[3] ? 1000 : 1);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function readClient(text: string): string | null {
  const candidates = [
    // "invoice Alex", "bill Priya Nair", "remind sam"
    /\b(?:invoice|bill|charge|remind|chase|nudge)\s+([A-Za-z][\w'-]*)(\s+[A-Z][\w'-]*)?/i,
    // "send Jordan an invoice"
    /\bsend\s+([A-Za-z][\w'-]*)(\s+[A-Z][\w'-]*)?\s+(?:an?|the)\s+(?:invoice|reminder|bill)\b/i,
    // "follow up with Dana", "an invoice to Dana Lee" (capitalised names only)
    /\b(?:to|with)\s+([A-Z][\w'-]*)(\s+[A-Z][\w'-]*)?/,
  ];
  for (const pattern of candidates) {
    const match = pattern.exec(text);
    if (!match) continue;
    const first = match[1];
    if (NOT_A_NAME.has(first.toLowerCase()) || /^inv-?\d/i.test(first)) continue;
    // The patterns are case-insensitive, so check here that a second word really is capitalised
    // ("Priya Nair"), otherwise "remind Sam about ..." would read the client as "Sam about".
    const surname = match[2] && /^\s+[A-Z]/.test(match[2]) ? match[2] : "";
    return capitalize(first) + surname;
  }
  return null;
}

function readDescription(text: string): string | null {
  // "for <words>" where the words are not an amount, up to a due clause or the end.
  const match = /\bfor\s+(?!\$|\d)(.+?)(?=[,;]?\s+(?:due|by|within|net\s*\d|in\s+\d)|[.?!]*$)/i.exec(text);
  const value = match?.[1].trim().replace(/[,;]$/, "");
  return value ? capitalize(value) : null;
}

function readDueInDays(lower: string): number | null {
  const match =
    /\b(?:in|within)\s+(\d{1,3})\s+days?\b/.exec(lower) ?? /\bnet\s*(\d{1,3})\b/.exec(lower) ?? /\bdue\s+(\d{1,3})\s+days?\b/.exec(lower);
  if (match) return Number(match[1]);
  if (/\btomorrow\b/.test(lower)) return 1;
  if (/\b(?:next week|in a week)\b/.test(lower)) return 7;
  return null;
}

export function previewIntent(input: string): IntentPreview {
  const text = input.trim().slice(0, 300);
  const lower = text.toLowerCase();
  const action = text ? readAction(lower) : "unknown";

  const preview: IntentPreview = {
    action,
    client: null,
    amountMinor: null,
    description: null,
    dueInDays: null,
    dueIsDefault: false,
    invoiceRef: /\binv-?\d{2,}\b/i.exec(text)?.[0].toUpperCase().replace(/^INV(?!-)/, "INV-") ?? null,
    missing: [],
  };
  if (action === "unknown" || action === "summary") return preview;

  preview.client = readClient(text);

  if (action === "invoice") {
    preview.amountMinor = readAmountMinor(text);
    preview.description = readDescription(text);
    const due = readDueInDays(lower);
    preview.dueInDays = due ?? 14;
    preview.dueIsDefault = due === null;
    if (!preview.client) preview.missing.push("Who should this be billed to?");
    if (preview.amountMinor === null) preview.missing.push("How much is it for?");
    if (!preview.description) preview.missing.push("What is it for?");
  } else if (!preview.client && !preview.invoiceRef) {
    preview.missing.push("Which client or invoice should be reminded?");
  }
  return preview;
}

export const SAMPLE_PROMPTS = [
  "Invoice Alex $500 for website development",
  "Bill Priya Nair $1,250 for brand identity, due in 30 days",
  "Remind Sam about invoice INV-0007",
  "Send Jordan an invoice for 320 for two hours of consulting",
  "Which clients have overdue payments?",
];
