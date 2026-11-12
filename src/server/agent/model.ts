import "server-only";
import { google } from "@ai-sdk/google";
import { wrapLanguageModel } from "ai";

const PRIMARY = process.env.GEMINI_MODEL || "gemini-flash-latest";
const FALLBACK = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";

/** After the main model says it is busy, go straight to the fallback for a while instead of waiting on it again. */
const COOL_DOWN_MS = 2 * 60_000;
let busyUntil = 0;

/** Overload and rate-limit answers are worth retrying on another model; anything else is a real error. */
function isBusy(error: unknown) {
  const status = (error as { statusCode?: number }).statusCode;
  const message = error instanceof Error ? error.message : String(error);
  return status === 503 || status === 429 || status === 500 || /high demand|overloaded|unavailable|resource exhausted/i.test(message);
}

/**
 * The assistant's model. When Gemini answers "high demand" for the main model (common on the free
 * tier), the same request is sent to a lighter model instead of failing. The switch happens before
 * any text is streamed, so the person never sees a half answer.
 */
export function assistantModel() {
  const primary = google(PRIMARY);
  if (FALLBACK === PRIMARY) return primary;
  const fallback = google(FALLBACK);

  return wrapLanguageModel({
    model: primary,
    middleware: {
      async wrapStream({ doStream, params }) {
        if (Date.now() < busyUntil) return fallback.doStream(params);
        try {
          return await doStream();
        } catch (error) {
          if (!isBusy(error)) throw error;
          busyUntil = Date.now() + COOL_DOWN_MS;
          console.warn(`[agent] ${PRIMARY} is busy, using ${FALLBACK} for the next ${COOL_DOWN_MS / 60_000} minutes`);
          return fallback.doStream(params);
        }
      },
      async wrapGenerate({ doGenerate, params }) {
        if (Date.now() < busyUntil) return fallback.doGenerate(params);
        try {
          return await doGenerate();
        } catch (error) {
          if (!isBusy(error)) throw error;
          busyUntil = Date.now() + COOL_DOWN_MS;
          return fallback.doGenerate(params);
        }
      },
    },
  });
}
