import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { forceReveal, markFontsReady } from "./lib/appReady";

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
