import { defineConfig } from "vitest/config";

// Local config so the functions tests don't inherit the app's root vitest setup.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
