import { defineConfig } from "vite";
import path from "node:path";

// Content scripts and background service worker: standalone single files, one build per entry.
const ENTRIES = ["content", "background", "duolingo", "duolingo-hook"];
const target = ENTRIES.includes(process.env.EXT_ENTRY ?? "") ? process.env.EXT_ENTRY! : "background";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: path.resolve(__dirname, `src/extension/${target}.ts`),
      formats: ["iife"],
      name: `zetje_${target.replace("-", "_")}`,
      fileName: () => `${target}.js`,
    },
  },
});
