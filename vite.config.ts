import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from a subpath on GitHub Pages (theodorjs.github.io/moviepedia/),
  // but from the root during local dev.
  base: command === "build" ? "/moviepedia/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
