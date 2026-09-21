import { defineConfig } from "vite"
import { crx } from '@crxjs/vite-plugin'
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { resolve } from "path"
import manifest from './public/manifest.json' with { type: 'json' }

// Builds the side panel as a React app. manifest.json stays in public/ and is copied
// to dist/ untouched, but crx resolves background/content_script entries it names
// (e.g. src/service-worker.js) as real source files and bundles them through Vite --
// they can't live under public/ since files there bypass the module graph entirely.
export default defineConfig({
  plugins: [react(), tailwindcss(),crx({ manifest }) ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html")
      }
    }
  }
})
