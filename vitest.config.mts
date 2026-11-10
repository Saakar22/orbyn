import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // The default "forks" pool hangs on Windows; threads is reliable.
  test: { environment: "node", pool: "threads" },
});
