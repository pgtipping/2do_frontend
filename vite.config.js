import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
