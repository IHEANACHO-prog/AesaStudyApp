import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // Ensures assets load correctly when deployed to subfolders or local environments
  base: './',
  
  plugins: [
    inspectAttr(), 
    react()
  ],
  
  resolve: {
    alias: {
      // Maps the "@" symbol to the "src" directory for cleaner imports
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Optimized build settings for a smoother student experience
  server: {
    port: 3000,
    strictPort: true,
    host: true
  }
});