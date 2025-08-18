import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Three.js is an intentionally isolated optional renderer chunk; keep its
    // known payload from masking warnings for the rest of the application.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"] }
      }
    }
  },
  test: { environment: "happy-dom", globals: true }
});
