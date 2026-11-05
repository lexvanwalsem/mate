import { defineConfig } from "vite";
import path from "node:path";

// Content script and background service worker: standalone single files.
const target = process.env.EXT_ENTRY === "content" ? "content" : "background";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: path.resolve(__dirname, `src/extension/${target}.ts`),
      formats: ["iife"],
      name: `zetje_${target}`,
      fileName: () => `${target}.js`,
    },
  },
});
