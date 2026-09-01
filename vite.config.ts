/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // maplibre-gl ships a separate worker bundle resolved via `new Worker(new URL(...))`;
  // Vite's dep pre-bundling breaks that resolution (404), silently blocking geojson tessellation.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage",
    },
  },
});
