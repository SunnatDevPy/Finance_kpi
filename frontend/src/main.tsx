import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { forceReveal, markFontsReady } from "./lib/appReady";
import { initRuntimeRecovery } from "./lib/runtimeRecovery";

initRuntimeRecovery();

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Yangi versiya chiqganda eski JS chunk'lari bilan nomuvofiqlikni oldini olish.
      void updateSW(true);
    },
  });
}

const rootEl = document.getElementById("root")!;

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Apple uslubidagi kirish: bo'sh/yarim tayyor holatni yoki ikkita
// loader'ni ketma-ket ko'rsatish o'rniga, brendlangan yagona loader
// (index.html) shriftlar VA haqiqiy sahifa (lazy route) ikkalasi ham
// tayyor bo'lgunicha ko'rinib turadi (qarang: App.tsx dagi RouteReady,
// lib/appReady.ts). Shu tarzda React'ning o'z Suspense fallback'i
// birinchi yuklanishda hech qachon ko'rinmaydi.
const fontsReady = document.fonts?.ready ?? Promise.resolve();
Promise.resolve(fontsReady).then(markFontsReady).catch(markFontsReady);

// Tarmoq/shrift yoki route chunk sekinlashib ketsa ham foydalanuvchi
// cheksiz loaderda qolib ketmasligi uchun xavfsizlik chegarasi.
window.setTimeout(forceReveal, 2500);
