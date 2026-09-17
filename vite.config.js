import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

// Builds the side panel as a React app; manifest.json/service-worker.js/content.js
// live in public/ and are copied to dist/ untouched since they run outside React
// in the extension's own contexts (background, content script).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html")
      }
    }
  }
})
