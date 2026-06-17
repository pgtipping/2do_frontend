import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // vitest runs the .js/.jsx suites (e.g. the Supabase driver). The legacy
    // .mjs suites use Node's built-in runner — see the "test:node" script.
    include: ["src/**/*.test.{js,jsx}"],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        const isPdfJsEvalWarning =
          warning.code === "EVAL" &&
          warning.id?.includes("pdfjs-dist") &&
          warning.message?.includes("Use of eval");

        if (isPdfJsEvalWarning) {
          return;
        }

        warn(warning);
      },
    },
  },
});
