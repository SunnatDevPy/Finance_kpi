import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg", "logo.png", "favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "WTMA Finance Panel",
        short_name: "WTMA Finance",
        description: "Moliyaviy boshqaruv paneli — mijozlar, shartnomalar, to'lovlar",
        theme_color: "#0f172a",
        background_color: "#fafbfc",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        lang: "uz",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
