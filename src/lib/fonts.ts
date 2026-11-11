import { Instrument_Serif } from "next/font/google";

// Display face for marketing headlines only (landing page and the auth panel). next/font
// self-hosts it and generates a size-adjusted fallback, so the swap does not shift layout.
export const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});
