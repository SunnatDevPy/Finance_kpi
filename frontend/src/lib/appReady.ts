/**
 * Ilova birinchi marta ochilganda ko'rinadigan yagona brendlangan
 * loader (index.html dagi #app-loader) faqat IKKALA shart bajarilgach
 * yashiriladi:
 *   1) shriftlar to'liq yuklangan (fontsReady)
 *   2) haqiqiy sahifa (lazy route chunk) Suspense'dan chiqib, DOM'ga
 *      chizilgan (routeReady)
 *
 * Shu tarzda React'ning o'zining Suspense fallback'i (`PageLoader`,
 * spinner) birinchi yuklanishda hech qachon ko'rinmaydi — foydalanuvchi
 * faqat bitta, yagona loader'ni ko'radi.
 */
let fontsReady = false;
let routeReady = false;
let revealed = false;

function reveal() {
  if (revealed) return;
  revealed = true;

  const rootEl = document.getElementById("root");
  const loaderEl = document.getElementById("app-loader");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rootEl?.classList.add("app-ready");
      loaderEl?.classList.add("app-loader--hidden");
      window.setTimeout(() => loaderEl?.remove(), 500);
    });
  });
}

function tryReveal() {
  if (fontsReady && routeReady) reveal();
}

export function markFontsReady() {
  fontsReady = true;
  tryReveal();
}

export function markRouteReady() {
  routeReady = true;
  tryReveal();
}

/** Tarmoq/shrift juda sekinlashib ketsa, foydalanuvchi cheksiz loaderda
 * qolib ketmasligi uchun xavfsizlik chegarasi sifatida chaqiriladi. */
export function forceReveal() {
  reveal();
}
