import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // "server-only" throws outside a React Server Components build; tests exercise server code directly.
      "server-only": path("./tests/stubs/server-only.ts"),
    },
  },
  // The default "forks" pool hangs on Windows; threads is reliable.
  test: { environment: "node", pool: "threads", setupFiles: ["./tests/setup.ts"], testTimeout: 30_000 },
});
