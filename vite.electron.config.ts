/**
 * Vite config used ONLY for the Electron desktop renderer build.
 *
 * The web/Lovable build (vite.config.ts) is untouched. This config produces a
 * plain client-side bundle with relative asset paths so Electron can load it
 * from `file://` with no server involved.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), tsConfigPaths({ projects: ["./tsconfig.json"] })],
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_DESKTOP_SPA": JSON.stringify("true"),
  },
  build: {
    outDir: "dist-electron/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(process.cwd(), "index.electron.html"),
    },
  },
  server: { port: 5199, strictPort: true },
});
