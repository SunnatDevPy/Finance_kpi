import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    // Docker Desktop (Windows) bind-mountlarida inotify hodisalari ishonchli
    // yetib bormaydi — shu sabab Vite fayl o'zgarishini "sezmay qolib",
    // eski (keshlangan) modulni xizmat qilishda davom etishi mumkin.
    // Polling bu holatni oldini oladi.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8002",
        changeOrigin: true,
      },
    },
  },
});
