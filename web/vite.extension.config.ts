import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "../extension/dist"),
    target: "esnext",
    cssMinify: "lightningcss",
    rolldownOptions: {
      input: {
        popup: path.resolve(__dirname, "popup.html"),
        settings: path.resolve(__dirname, "settings.html"),
        background: path.resolve(__dirname, "src/extension/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
})
