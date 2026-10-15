import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts", "src/adapters/**/*.ts", "src/services/**/*.ts", "src/mcp/**/*.ts"],
      exclude: ["src/adapters/browser.ts"],
      reporter: ["text-summary", "text"],
    },
  },
});
