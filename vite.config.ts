import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The analysis page (the actual app). Content script and background are built separately.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: { input: { index: path.resolve(__dirname, "index.html") } },
  },
});
