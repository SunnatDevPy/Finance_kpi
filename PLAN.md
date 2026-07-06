# Finance boshqaruv paneli — ish rejasi (WTMA)

> Eski `TODO.text` fayli ushbu hujjatga ko'chirildi va davom ettirildi. Yangi ishlar shu faylga qo'shiladi.

## ✅ Bajarilgan ishlar

### 0–4. Asosiy loyiha
- [x] Backend: FastAPI + SQLAlchemy + PostgreSQL + Docker
- [x] Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- [x] Autentifikatsiya (login, rollar: admin/menejer)

### 5. UI kuchaytirish
- [x] Ko'p tillilik (O'zbek / Русский) — barcha sahifalar
- [x] Yorug' / Qorong'u mavzu
- [x] Tanlov localStorage'da saqlanadi

### 6. Qo'shimcha
- [x] Parolni o'zgartirish (profil sahifasi + API)
- [x] Eksport (Excel / PDF)

### 7. Kengaytirish
- [x] To'lovlar sahifasi (filter + eksport)
- [x] Eksport sana filtri (to'lovlar, kontraktlar)
- [x] Bildirishnoma kunlari sozlamasi (profil)

### 8. Qulaylik
- [x] Kontrakt tahrirlash (UI)
- [x] Global mijoz qidiruv (header)
- [x] To'lovni o'chirish
- [x] Login sahifasi (2 ustun, bayroqli til)

### 9. Kontraktlar
- [x] Holat belgisi (faol / tugayapti / tugagan)
- [x] Kontraktni nusxalash
- [x] PageError va Clients i18n

### 10. Dashboard sozlamalari
- [x] Oylik reja (admin, DB + profil)

### 11. Pagination
- [x] Mijozlar, kontraktlar, to'lovlar (sahifalash + total)

### 12. Dizayn kuchaytirish (2026-yil iyul)
- [x] `PageShell`, `filter-bar`, `info-grid` — barcha sahifalarda izchil layout
- [x] `CompanyAvatar` + `TableCellCompany` — jadvallarda kompaniya avatarlari
- [x] Dashboard: yangi stat-kartalar (to'langan summa, undirish darajasi, shartnomalar soni)
- [x] Dashboard: "Tezkor tahlil" bo'limi — xizmatlar bo'yicha daromad, mijozlar holati (donut), balans progress-bar
- [x] Top-mijozlar jadvali — reyting (medal), to'lov darajasi progress-bar
- [x] Muddati yaqinlashayotgan shartnomalar — muddatga qarab rang kodlash (qizil/amber)
- [x] IBM Plex Sans shrifti (Google Fonts CDN orqali)
- [x] Docker: `node_modules` volume muammosi tuzatildi, build barqarorlashtirildi

### 13. Framer Motion animatsiyalari (2026-yil iyul)
- [x] `.cursor/skills/framer-motion/` — loyihaga maxsus, xavfsiz animatsiya skill (SKILL.md + patterns.md)
- [x] `.cursorrules`ga Framer Motion standartlari qo'shildi
- [x] Sahifalar orasida o'tish animatsiyasi (`Layout.tsx` + `AnimatePresence`)
- [x] Dashboard stat-kartalar — raqamlarni silliq sanab chiqish (`AnimatedNumber`)
- [x] Dashboard, Clients, Contracts, Payments, Employees, ClientCard — jadval qatorlari stagger animatsiyasi (`MotionTableRow`)
- [x] ServiceTypes — kartalar grid stagger + hover micro-interaction
- [x] NotificationBell, GlobalSearch — dropdown panellar uchun `AnimatePresence`
- [x] Contracts formasi — dinamik xizmat qatorlari qo'shish/o'chirish animatsiyasi
- [x] Login sahifasi — to'liq kirish animatsiyasi (karta, logo, feature-list stagger, xato xabari)

### 14. Performance optimizatsiyasi (2026-yil iyul)
- [x] Route-level code-splitting (`React.lazy` + `Suspense`, `PageLoader`)
- [x] Vite `manualChunks` — `vendor-react`, `vendor-charts`, `vendor-motion`, `vendor-icons`
- [x] Asosiy bundle: 1090 KB → 386 KB (chunk size warning yo'qoldi)
- [x] `Pagination` tugmalariga `whileTap` micro-interaction (`MotionButton`)
- [x] Dialog/AlertDialog animatsiyasi tekshirildi (Base UI CSS orqali allaqachon silliq — o'zgartirilmadi)

### 15. Mobil moslashuvchanlik (2026-yil iyul)
- [x] `Layout.tsx` — sidebar mobilda burger-menyu bilan ochiladigan slide-in drawer'ga aylantirildi (overlay backdrop, Escape/tashqariga bosish bilan yopiladi, sahifa almashganda avtomatik yopiladi, drawer ochiqda body scroll bloklanadi)
- [x] `AppHeader.tsx` — burger tugma qo'shildi (`lg:hidden`), header padding/gap mobilga moslashtirildi
- [x] `SettingsToolbar` (header variant) — mobilda til nomi matni yashirinadi, faqat bayroq+chevron qoladi
- [x] Contracts formasi — sana maydonlari va xizmat qatori (Select + narx + o'chirish tugmasi) mobilda vertikal joylashadi
- [x] Barcha grid/filter joylashuvlar mobil breakpoint'lar bo'yicha tekshirildi (ko'pchiligi allaqachon `grid-cols-1` bazasi bilan qurilgan edi)

### 16. Loyihaga maxsus Cursor skilllar (2026-yil iyul)
- [x] `wtma-backend` — FastAPI/SQLAlchemy overlay (global `fullstack-backend` asosida)
- [x] `wtma-frontend` — React overlay (global `react-frontend` asosida)
- [x] `wtma-i18n` — O'zbek/Rus overlay (global `i18n-multilingual` asosida)
- [x] `wtma-docker` — Docker overlay (global `docker-dev` asosida)

### 17. Universal skilllar + alirezarezvani/claude-skills (2026-yil iyul)
- [x] Global skilllar: `fullstack-backend`, `react-frontend`, `i18n-multilingual`, `docker-dev` (`~/.cursor/skills/`)
- [x] [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) dan 11 ta skill global o'rnatildi (senior-*, code-reviewer, apple-hig-expert, ...)
- [x] `C:\Users\Asus\skill.md` — to'liq katalog (loyihadan tashqari)

### 18. Premium UI (21st uslubi, 2026-yil iyul)
- [x] Global CSS: `glass-panel`, `premium-hero`, `shine-border`, `dot-grid`, stat-card glow
- [x] `StatCard` — 21st Statistics Card uslubida qayta dizayn (icon box, hover lift)
- [x] `PageHeader` — gradient fon + accent chiziq
- [x] Dashboard hero banner — cinematic mesh + dot-grid
- [x] `PremiumDataTable` — glass wrapper, jadval hover accent
- [x] Login — premium split-card, animatsiyali fon
- [x] Sidebar + AppHeader polish

### 19. Qo'shimcha skilllar (2026-yil iyul)
- [x] [mattpocock/skills](https://github.com/mattpocock/skills) — 38 ta engineering skill (`.agents/skills/`)
- [x] [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) — 9 ta skill (React best practices, web-design-guidelines, ...)
- [x] `CONTEXT.md` — WTMA domain glossary
- [x] `skills-lock.json` — skill qayta o'rnatish uchun

### 20. UI micro-interactions (2026-yil iyul)
- [x] `MotionButton` + `motionTap` — Clients, Contracts, Payments, Employees, ServiceTypes (qo'shish/saqlash/o'chirish/tahrirlash)
- [x] `PremiumDataTable` skeleton — stagger + pulse animatsiyasi
- [x] Recharts `ChartTooltipContent` — fade/slide animatsiyasi + glass blur

### 21. ClientCard + testlar + production (2026-yil iyul)
- [x] `ClientCard` — to'lov tugmalari `MotionButton`
- [x] Backend pytest — 7 test (auth, health, clients) + `requirements-dev.txt`
- [x] Playwright E2E — login va navigatsiya (`frontend/e2e/`, `npm run test:e2e`)
- [x] Production Docker — `docker-compose.prod.yml`, `Dockerfile.prod`, nginx, `.env.prod.example`
- [x] Matt Pocock setup — `docs/agents/issue-tracker.md`, `docs/adr/`, `AGENTS.md`

---

### 22. Testlar va CI (2026-yil iyul)
- [x] Backend pytest — contracts, payments, dashboard (jami 15 test)
- [x] Playwright E2E kengaytirish — mijoz yaratish, kontraktlar, to'lovlar (`e2e/flows.spec.ts`)
- [x] E2E to'liq biznes oqimi — mijoz → kontrakt → to'lov (`e2e/full-flow.spec.ts`)
- [x] `ClientCard` bugfix — `payments.list(limit: 500)` API limiti buzilgan edi
- [x] API rate limiting — `slowapi` (login 10/daq, parol 5/daq) + security headers
- [x] GitHub Actions CI — `.github/workflows/ci.yml` (pytest + build + e2e)

---

### 23. DateRangePicker — maxsus kalendar (2026-yil iyul)
- [x] `DateRangePicker` komponenti — bitta "dan — gacha" tanlov
- [x] Presetlar: Bugun, Kecha, 1 hafta, 1 oy, 1 yil
- [x] Qora/oq (dark/light) mavzuga moslashuv
- [x] `Payments` va `Contracts` filtrlari yangilandi
- [x] i18n — `uz.ts` va `ru.ts`

---

### 24. Top mijozlar — LTV statistikasi (2026-yil iyul)
- [x] Backend: `GET /dashboard/top-clients?limit=` — mijozlarni umr bo'yi qiymati (LTV, all-time to'lovlar) bo'yicha tartiblash
- [x] `TopClientLtvItem` sxemasi — `total_paid`, `contracts_count`, `share_pct` (umumiy tushumdagi ulushi)
- [x] Dashboard'da yangi bo'lim — Top 10 / 20 / 30 tanlash tugmalari, reyting, ulush progress-bar
- [x] i18n — `uz.ts` va `ru.ts` yangi kalitlar
- [x] Backend pytest — yangi endpoint uchun 3 test (limit validatsiya, ulush hisob-kitobi, bo'sh holat)
- [x] `ClientCard` bugfix — `payments.list({ contract_id })` → `{ contractId }` (TS2561)

---

### 25. DateRangePicker portal bugfixi (2026-yil iyul)
- [x] Kalendar oynasi `React Portal` orqali `document.body`ga chiqariladi — `backdrop-blur` stacking-context tuzog'idan qutuldi (kartalar orqasida ochilib qolish bugi tuzatildi)
- [x] Pozitsiya `getBoundingClientRect` bilan hisoblanadi, scroll/resize'da qayta hisoblanadi, ekrandan chiqib ketmaslik uchun chegaralanadi

### 26. Shartnoma xizmatlarini bekor qilish + qaytarish (2026-yil iyul)
- [x] `ContractLineItem`ga `is_cancelled`, `cancelled_at` maydonlari (migratsiya `004_line_item_cancellation`)
- [x] Bekor qilingan xizmat ro'yxatda chizib ko'rsatiladi (strikethrough + badge), shartnoma summasidan ayiriladi, qayta faollashtirish mumkin
- [x] `Payment.amount` manfiy qiymatga ruxsat (qaytarish/refund yozuvi) — manfiy qarz "ortiqcha to'lov" deb yashil rangda ko'rsatiladi
- [x] Backend endpointlar: `PATCH /contracts/{id}/line-items/{id}/cancel`, `/reactivate`, `POST /contracts/{id}/cancel-all`
- [x] Backend testlar (`test_contract_cancellation.py`) + frontend UI (`ClientCard.tsx`, `Contracts.tsx` — tugmalar, badge'lar, refund modal)
- [x] Export (Excel/PDF) — bekor qilingan xizmatlar "(bekor qilingan)" belgisi bilan chiqadi

### 27. Qarzdorlik hisoboti — yangi sahifa (2026-yil iyul)
- [x] `GET /debts` — har bir korxona va shartnoma bo'yicha qarz (yoki ortiqcha to'lov) hisob-kitobi, qidiruv parametri bilan
- [x] Yangi `Debts.tsx` sahifa — jami qarz/ortiqcha to'lov/qarzdorlar soni statistikasi, jadval, eksport, navigatsiyaga qo'shildi
- [x] Backend testlar (`test_debts.py`) — bo'sh holat, qarz hisob-kitobi, ortiqcha to'lov, qidiruv

### 28. Excel orqali mijozlarni ommaviy import qilish (2026-yil iyul)
- [x] `GET /clients/import-template` — to'ldirish uchun tayyor `.xlsx` shablon (misol qator bilan)
- [x] `POST /clients/import` — yuklash, validatsiya, mavjud (company_name bo'yicha) mijozlarni o'tkazib yuborish + alohida "takroriy" ro'yxat qaytarish
- [x] Frontend: Clients sahifasida "Excel'dan import" tugmasi + shablon yuklab olish + natija modali (yaratildi/takroriy/xato sonlari)
- [x] Backend testlar (`test_client_import.py`) — shablon, yaratish, duplikat, validatsiya xatosi, noto'g'ri fayl formati

### 29. Dashboard diagrammalarini zamonaviylashtirish (2026-yil iyul)
- [x] Backend: `GET /dashboard/revenue-trend?months=6|12` — asosiy sana filtridan mustaqil, oxirgi N oy tushumi
- [x] Tushum trendi diagrammasiga 6 oy / 12 oy almashtirish tugmasi (segmented control, header'da)
- [x] Barcha diagramma kartalariga (`RevealCard`) scroll-triggered fade+slide kirish animatsiyasi (Framer Motion `whileInView`)
- [x] Backend testlar (`test_dashboard.py`) — 6/12 oy va validatsiya

---

## 🔜 Keyingi rejalar (hali bajarilmagan)

- [x] Production: HTTPS (reverse proxy / Caddy / Traefik)
- [x] Rate limiting va API security hardening (`slowapi`, security headers)
- [x] E2E: to'liq kontrakt + to'lov yaratish oqimi (`e2e/full-flow.spec.ts`)

---

### 30. Yakuniy tekshiruv (2026-yil iyul)
- [x] Backend: 34/34 pytest testlar o'tdi (`docker compose exec api python -m pytest`)
- [x] Frontend: `tsc -b && vite build` xatosiz yig'ildi

---

### 31. Eski Excel'dan shartnomalar tarixini import qilish (2026-yil iyul)
- [x] `Contract`ga `contract_number` (shartnoma №) va `invoice_number` (ЭСФ raqami — ixtiyoriy) maydonlari (migratsiya `005_contract_number_invoice`)
- [x] Yangi shablon eski Excel tuzilishiga mos: Kompaniya, Xizmat, "Shartnoma № va sana", Summa, To'landi, ЭСФ — ustunlarni to'g'ridan-to'g'ri copy-paste qilish uchun
- [x] `GET /contracts/import-template`, `POST /contracts/import` — har bir qator alohida shartnoma sifatida import qilinadi:
  - Mijoz kompaniya nomi bo'yicha topiladi yoki avtomatik yaratiladi (barcha shartnomalari bitta mijoz kartasida ko'rinadi)
  - Xizmat turi nomi bo'yicha topiladi yoki avtomatik yaratiladi
  - "№1 dan 23.01.2026" formatidagi matndan shartnoma raqami va sanasi ajratib olinadi
  - "To'landi" ustuni bo'yicha avtomatik To'lov yozuvi yaratiladi, qarz avtomatik hisoblanadi
  - Bir xil mijoz + shartnoma raqami takrorlansa — qatordan o'tkazib yuborilib, alohida ro'yxatda ko'rsatiladi
- [x] Frontend: Contracts sahifasida "Excel'dan import" tugmasi + natija modali (yaratilgan shartnoma/mijoz/xizmat sonlari, takroriy va xato ro'yxatlari)
- [x] Shartnoma raqami va ЭСФ — Contracts jadvali, forma va ClientCard'da ko'rsatiladi; Excel/PDF eksportga ham qo'shildi
- [x] Backend testlar (`test_contract_import.py`) — yaratish, mavjud mijoz/xizmatni qayta ishlatish, duplikat aniqlash, qator xatolari, noto'g'ri format
- [x] Backend: 40/40 pytest testlar o'tdi, frontend build xatosiz

### 32. Haqiqiy mijoz Excel fayli bilan sinov + moslashuvchan ustun aniqlash (2026-yil iyul)
- [x] Mijozning haqiqiy eski Excel fayli tekshirildi: ustunlar — №, Наименование предприятия, Название услуги, Номер и дата договора, Сумма, Поступление, Долг; rang: yashil = to'liq to'langan ("готово"), sariq = qisman qarz, Долг ustunida raqam
- [x] Import xizmati endi **sarlavha nomiga qarab** ustunlarni avtomatik aniqlaydi (o'zbek/rus, ixtiyoriy tartib) — mijozning eski faylini ustunларни qayta joylashtirmasdan to'g'ridan-to'g'ri yuklash mumkin
- [x] Rangga emas, **Summa va Poступление solishtirishga** tayanilgan qoida: teng bo'lsa — qarz 0 (to'liq yopilgan); agar "Poступление" bo'sh-u "Долг" ustunida "готово"/"tayyor" kabi holat yozilgan bo'lsa ham — to'liq to'langan deb hisoblanadi
- [x] Haqiqiy fayl (`Лист Microsoft Excel.xlsx`, 7 qator) sinovdan o'tkazildi — barcha summalar, sanalar, shartnoma raqamlari va to'lov holati to'g'ri aniqlandi, so'ng sinov ma'lumotlari bazadan tozalandi
- [x] Backend testlar (`test_contract_import.py`) — haqiqiy fayl tuzilishi, "yopilgan" matn evristikasi, notanish sarlavhalarni rad etish (jami 43/43 pytest o'tdi)
- [x] i18n matnlari yangilandi — ustun tartibi muhim emasligi tushuntirildi

### 33. Soft-delete + Audit log (2026-yil iyul)
- [x] `Client`/`Contract`/`Payment` ga `deleted_at` maydoni — hard delete o'rniga soft-delete, kaskad bilan (mijoz o'chirilsa shartnomalar ham)
- [x] `AuditLog` jadvali — har bir create/update/delete/restore amali kim, qachon, nimani o'zgartirgani bilan yoziladi
- [x] `GET /*/trash` + `POST /*/{id}/restore` (admin) — Arxiv sahifasi orqali tiklash
- [x] `GET /audit/log` — O'zgarishlar tarixi sahifasi, entity turi/foydalanuvchi bo'yicha filtr
- [x] Barcha hisobot/dashboard/eksport so'rovlari o'chirilgan yozuvlarni chetlab o'tadigan qilib yangilandi

### 34. Xarajatlar (Expenses) moduli (2026-yil iyul)
- [x] `Expense` modeli + `ExpenseCategory` enum (ish haqi, ijara, marketing va h.k.) — soft-delete bilan
- [x] To'liq CRUD + kategoriya bo'yicha jamlanma (`/expenses/summary`) + Arxiv/Audit integratsiyasi
- [x] Dashboard: `total_expenses`, `net_profit`, `profit_margin_pct` + xarajat/foyda grafiklari
- [x] Frontend: `/expenses` sahifasi (CRUD, filtr, eksport), sidebar havolasi
- [x] Backend testlar (`test_expenses.py`), jami 54/54 pytest o'tdi

### 35. Rasmiy hujjat generatsiyasi — schyot-faktura va akt (2026-yil iyul)
- [x] `GET /contracts/{id}/documents/{invoice|act}` — kontrakt bo'yicha PDF schyot-faktura yoki bajarilgan ishlar dalolatnomasi
- [x] `AppSetting` orqali kompaniya rekvizitlari (nomi, manzili, STIR, bank, MFO, rahbar) — Profil sahifasida admin tomonidan tahrirlanadi (`PATCH /settings/company-profile`)
- [x] PDF'larda kirill/o'zbek matnini to'g'ri chizish uchun `DejaVu Sans` shrifti ro'yxatga olindi (`fonts-dejavu-core`, backend Docker image'ga qo'shildi) — mavjud jadval eksportlari ham shu shriftdan foydalanadigan qilindi
- [x] Frontend: Kontraktlar va mijoz kartasi sahifalarida har bir shartnoma qatorida "Schyot-faktura" va "Akt" yuklab olish tugmalari
- [x] Backend testlar (`test_documents.py`) — PDF generatsiya, noto'g'ri hujjat turi, mavjud bo'lmagan kontrakt, kompaniya profili CRUD (jami 59/59 pytest o'tdi)

---

### 33. Login globusi qayta ko'rinmay qolishi — barqarorlashtirish (2026-yil iyul)
- [x] Sabab: `cobe` WebGL konteksti keyinchalik yo'qolsa (GPU drayver, resurs tejash) yoki init "ready" holatiga hech qachon o'tmasa, komponent buni sezmay, foydalanuvchi cheksiz spinner yoki bo'sh joy ko'rib qolardi
- [x] `CobeGlobe.tsx`ga `webglcontextlost` tinglovchisi qo'shildi — kontekst yo'qolsa avtomatik CSS fallback globusga o'tadi
- [x] 2.5 soniyalik xavfsizlik taymeri qo'shildi — globus shu vaqt ichida tayyor bo'lmasa, fallbackka o'tiladi (cheksiz spinnerning oldi olinadi)
- [x] Playwright orqali ikkala holat (WebGL bor/yo'q) tekshirildi — ikkalasida ham globus ko'rinadi, `tsc -b` xatosiz

---

### 34. Login globusi — WebGL'siz, Canvas 2D nuqta-matritsa globusiga o'tkazildi (2026-yil iyul)
- [x] Sabab: 33-banddagi tuzatishlar (kontekst-lost tinglovchisi, xavfsizlik taymeri) faqat WebGL **kontekst yaratilmagan** holatlarni ushlardi; ba'zi kompyuterlarda GPU drayveri kontekstni "muvaffaqiyatli" yaratardi-yu, hech qanday piksel chizmasdi — bu holatni kod ichidan aniqlab bo'lmasdi, natijada globus doimiy ko'rinmay qolardi
- [x] `.cursorrules` qoidasiga ("faqat Tailwind + Framer Motion, uchinchi tomon yopiq kutubxona yo'q") mos ravishda `cobe` (WebGL) kutubxonasi butunlay olib tashlandi (`package.json`dan ham)
- [x] Birinchi urinish — sof CSS (statik xarita teksturasi + gradient) — GPU muammosini hal qildi, lekin vizual jihatdan "tekis/oddiy" chiqdi (haqiqiy aylanish yo'q, shahar nuqta/yoylari yo'qolgan)
- [x] Yakuniy yechim — `LoginGlobe.tsx` butunlay **Canvas 2D** bilan qayta yozildi: quruqlik nuqtalari Fibonacci panjara orqali sfera bo'ylab taqsimlanadi, `globe-texture.svg` orqali quruqlik/okean aniqlanadi, har kadrda 3D aylantirilib (`phi`/`theta`) 2D'ga proyeksiya qilinadi — natijada **haqiqiy aylanuvchi nuqta-matritsa globus** (eski WebGL versiyaga vizual jihatdan deyarli bir xil)
- [x] Toshkent (markaz) va London/Nyu-York/Tokio/Dubay/Pekin uchun haqiqiy lat/lon asosida porloq belgi-nuqtalar + ular orasida sferaga mos egilgan, gorizontda so'nadigan yoy chiziqlar (`slerp` + balandlik funksiyasi)
- [x] Sichqoncha bilan tortib aylantirish (drag-to-rotate) qayta tiklandi, `prefers-reduced-motion`da avtomatik aylanish o'chadi
- [x] Canvas 2D hech qachon "kontekst bor-u chizmaydi" holatiga tushmaydi (GPU/drayverga bog'liq emas) — muammo ildizidan bartaraf etildi
- [x] `index.css`dagi endi ishlatilmaydigan `globe-map`/`cobe-fallback-*`/`login-globe-spin*` klass va keyframe'lar tozalandi
- [x] `npm run build` (tsc + vite) va Playwright orqali vizual tekshiruv (light/dark, mobil, aylanish) xatosiz o'tdi
- [x] Zichlik/3D kuchaytirish: okean ham xiraroq/kichikroq nuqta-to'r sifatida chizila boshladi (butun sfera nuqtalar bilan qoplanadi), yorug'lik kontrasti oshirildi (eksponensial egri — "yaltiroq" hissi), nuqta soni va o'lchami oshirildi, yoy/belgi-nuqtalarga kuchliroq porlash (`shadowBlur`) qo'shildi
- [x] Yoy kesilish bugi tuzatildi: canvas ilgari globus bilan bir xil o'lchamda `overflow-hidden rounded-full` konteyner ICHIDA edi, shu sabab yoylarning sfera ustidan ko'tarilgan qismi aylana chegarasida kesilib qolardi — endi canvas globusdan 1.5x katta va kesilmagan qatlam sifatida chiqarildi (sfera tanasi va yaltirash/soya effektlari esa alohida, aylana shaklida kesilgan qatlamlarda qoladi), yoylar endi globus siluetidan tashqarida aniq ko'rinadi
- [x] Yoy "tepasi kesilib qolish" bugi (chuqur sabab): ikkita shimoliy kenglikdagi shahar orasidagi buyuk doira ba'zan qutbga yaqinroq egiladi (haqiqiy sferik geometriya) — ba'zi burilish burchaqlarida bu sahifaning o'zidan tashqariga chiqib ketardi. Yechim: (1) yoyning markazdan uzoqligi `SAFE_R` radius bilan qat'iy chegaralandi, (2) sferaning orqa tomoniga o'tgan segmentlar endi to'satdan kesilmaydi, balki asta-sekin shaffoflashadi (fade) — chiziq har doim boshidan oxirigacha "chiziladi", faqat globus ortiga kirganda ko'zga ko'rinmay qoladi
- [x] **Ishlash tezligi (freeze) bugi**: yoy-fade tuzatishi dastlab har segment uchun alohida `stroke()` chaqirardi (6 yoy x 40 segment = 240 soyalangan chizish/freym) — bu butun sahifani "qotirar" edi. Shuningdek minglab (9000 gacha) sfera nuqtasining HAR BIRI alohida `beginPath()/fill()` bilan chizilardi. Ikkalasi ham **guruhlashtirilgan (batched) chizish**ga o'tkazildi: yoylar endi har biri bor-yo'g'i 2 ta stroke() bilan (to'liq ko'rinadigan + so'nayotgan "dum" qismi), nuqtalar esa soya/shaffoflik bo'yicha ~100-150 ta `Path2D` guruhiga yig'ilib, har guruh bitta `fill()` bilan chiziladi — vizual natija bir xil qoladi, lekin freymdagi canvas chaqiruvlari minglabdan yuzlabgacha qisqaradi, freeze yo'qoladi

---

### 35. Production HTTPS — Caddy reverse proxy (2026-yil iyul)
- [x] `Caddyfile` qo'shildi — `DOMAIN` uchun Let's Encrypt sertifikatini avtomatik oladi/yangilaydi, HTTP (80) → HTTPS (443) avtomatik yo'naltiriladi, HSTS va xavfsizlik sarlavhalari qo'shildi
- [x] `docker-compose.prod.yml`ga `caddy` xizmati qo'shildi (`caddy:2-alpine`, `caddy_data`/`caddy_config` volumelar sertifikatlarni saqlash uchun) — endi faqat Caddy hostning 80/443 portlariga ulanadi, `web` (nginx) esa ichki tarmoqda (`expose`) qoladi
- [x] `.env.prod.example`ga `DOMAIN`, `ACME_EMAIL`, `HTTP_PORT`, `HTTPS_PORT` qo'shildi; `DOMAIN=localhost` bo'lsa Caddy ichki (self-signed) sertifikat bilan lokal sinovga imkon beradi
- [x] Backend cookie/secure-flag'ga bog'liq emas (JWT Bearer token, `localStorage`) — Caddy→nginx orasidagi ichki HTTP ulanishi xavfsizlikka ta'sir qilmaydi
- [x] `caddy validate`, `docker compose config` va to'liq lokal smoke-test (`DOMAIN=localhost`, alohida proyekt nomi bilan) orqali tekshirildi: HTTPS orqali frontend (`200`), `/api/*` proksi (`{"status":"ok"}`) va HTTP→HTTPS avtomatik yo'naltirish (`308 Location: https://...`) barchasi ishlayapti (haqiqiy domenda Let's Encrypt sertifikat olish esa foydalanuvchining haqiqiy DNS/domenini talab qiladi, bu qadam qo'lda tekshirilmadi)
- [x] `README.md`dagi "Production'ga chiqarish" bo'limi yangilandi (HTTPS sozlash qadamlari)

---

### 36. Login sahifasi atmosferasi — chiroyli va "hayratlanarli" qilib boyitildi (2026-yil iyul)
- [x] Sabab: foydalanuvchi login sahifasining umumiy atmosferasini yanada chiroyli qilishni so'radi, kerak bo'lsa globus uchun tayyor kod topib qo'yishni taklif qildi; `.cursorrules` va 34-bandda qayd etilgan tajriba (`cobe`/WebGL barqarorsizligi) sabab uchinchi tomon globus kutubxonasi ishlatilmadi — o'rniga butun atmosfera sof Tailwind/Framer Motion/CSS bilan boyitildi
- [x] Yangi `LoginAtmosphere.tsx` komponenti — nebula mesh, aurora nur dog'lari, ko'tarilib boruvchi yorug' zarrachalar (particles), pastda gorizontga ketuvchi 3D panjara (`login-horizon-grid`) va nozik filmik grain qatlamini birlashtiradi
- [x] `LoginGlobe.tsx`ga: sichqoncha holatiga qarab yengil 3D tilt (Framer Motion `useMotionValue`/`useSpring`, `perspective` + `rotateX/rotateY`), atmosfera rim-light (fresnel) qatlami va vaqti-vaqti bilan uchib o'tuvchi kometa effekti qo'shildi
- [x] **Ishlash tezligi**: dastlabki `filter: blur()` bilan aylanuvchi aurora qatlami headless/GPU'siz muhitda FPS'ni ~21'dan ~3'gacha tushirib yubordi — `.cursorrules`dagi 60 FPS talabiga zid edi. Tuzatish: `filter: blur()` butunlay olib tashlandi (o'rniga yumshoq radial-gradient stoplari), `mix-blend-mode` yangi qatlamlardan olib tashlandi, aurora bitta qatlamga birlashtirildi, zarrachalar soni kamaytirildi — barcha animatsiyalar endi faqat `transform`/`opacity` bilan ishlaydi (`will-change` bilan), Playwright orqali FPS o'lchab tasdiqlandi
- [x] `npm run build` xatosiz o'tdi, Playwright orqali light/dark/mobil va sichqoncha tilt holatlari vizual tekshirildi

---

---

### 37. To'lov modali UX + custom sana/summa inputlari + mijoz logotipi (2026-yil iyul)
- [x] "To'lov qo'shish" modalida "To'lov turi" va "Sana" maydonlari endi bitta qatorda (yonma-yon) joylashgan
- [x] Native brauzer `<input type="date">` o'rniga to'liq custom `FloatingLabelDatePicker` (`components/ui/date-picker.tsx`) — oy/yil navigatsiyasi, "Bugun"/"Tozalash" tugmalari, `DateRangePicker`dagi mavjud kalendar mantig'idan (`lib/dateRange.ts`) qayta foydalaniladi; to'lov, shartnoma (boshlanish/tugash, `end_date` uchun `min` sifatida `start_date`) va xarajat sanalarida qo'llanildi
- [x] Native `<button>`ga o'tish sabab yo'qolgan brauzer `required` validatsiyasi o'rniga har uch formda (`ClientCard`, `Contracts`, `Expenses`) aniq JS tekshiruvi qo'shildi
- [x] Summa maydonlari uchun `useMoneyInput` hooki + `FloatingLabelMoneyInput`/`MoneyInput` komponentlari — endi raqam kiritilganda avtomatik probel bilan mingliklarga ajratiladi (`1 500 000`) va boshiga `0` yozish bloklanadi; kursor pozitsiyasi to'g'ri saqlanadi (o'rtadan tahrirlashda ham)
- [x] To'lov summasi, shartnoma xizmat narxi, xarajat summasi va oylik reja (Profil) shu yangi komponentlarga o'tkazildi; tahrirlashda API'dan kelgan (`"1500000.00"` kabi) qiymatlar `toWholeAmountDigits()` orqali toza butun raqamga normallashtiriladi (aks holda ".00" raqamlarga qo'shilib ketardi)
- [x] Backend: `Client` modeliga `logo_path` maydoni (migratsiya `009`) + hisoblanuvchi `logo_url` property; `POST/DELETE /clients/{id}/logo` endpointlari (rasm turi va 5MB hajm tekshiruvi bilan, eski fayl avtomatik o'chiriladi); yuklangan rasmlar `backend/uploads/client_logos/` papkasida saqlanadi va `/api/v1/uploads/...` orqali statik xizmat qilinadi (`docker-compose.prod.yml`ga alohida `uploads_data` volume qo'shildi)
- [x] Frontend: umumiy `CompanyAvatar` komponenti endi `logoUrl` bo'lsa rasmni ko'rsatadi (aks holda eski initsial-belgi fallback); yangi `ClientLogoUploader` komponenti — mijozlar ro'yxati tahrirlash modali va mijoz kartasi sahifasida logotip yuklash/o'chirish imkonini beradi
- [x] Backend testlar (`test_clients.py`ga logotip yuklash/o'chirish/xato holatlar qo'shildi, yuklamalar uchun `tmp_path` bilan izolyatsiya) — jami 62/62 pytest va frontend build (`tsc -b && vite build`) xatosiz o'tdi

---

### 38. "Moliya" moduli — umumiy kirim/chiqim ledger + Excel orqali eski tarixni import qilish (2026-yil iyul)
- [x] Backend: yangi `Income` modeli (`migratsiya 010`) — shartnomaga bog'liq bo'lmagan "boshqa kirimlar" uchun (`sale`, `service`, `investment`, `loan`, `grant`, `refund`, `other` kategoriyalari); mijozdan shartnoma bo'yicha tushgan pul hamon `Payment` orqali hisoblanadi
- [x] `Income` uchun to'liq CRUD API (`/incomes` — list/create/get/patch/delete/summary/trash/restore), `Expense` bilan bir xil soft-delete + audit log naqshi
- [x] Yangi `GET /finance/ledger` — `Payment` (mijoz to'lovlari) + `Income` (boshqa kirim) + `Expense` (chiqim) bitta xronologik ro'yxatga birlashtiriladi, tur/sana/qidiruv bo'yicha filtrlanadi, jami kirim/chiqim/sof balans hisoblab qaytariladi
- [x] `POST /finance/import` + `GET /finance/import-template` — eski Excel hisobotini (Sana, Turi — Kirim/Chiqim, Nomi, Summa, Kategoriya, Izoh) yuklash; ustunlar moslashuvchan aniqlanadi (o'zbek/rus sarlavhalar), "Turi" ustuni bo'lmasa summaning ishorasidan (manfiy = chiqim) avtomatik aniqlanadi, kategoriya matndan eng yaqin enum qiymatiga moslashtiriladi
- [x] Dashboard P&L: `total_other_income`/`period_other_income` qo'shildi, sof foyda hisобi endi boshqa kirimlarni ham hisobga oladi (`net_profit = tushum + boshqa_kirim - xarajat`)
- [x] Export: `incomes` resursi ham `/export/{resource}` ga qo'shildi (xlsx/pdf), `Trash` va `AuditLog` sahifalariga "Kirimlar" bo'limi qo'shildi
- [x] Frontend: yangi `Moliya` sahifasi (`/finance`) — jami kirim/chiqim/sof balans statistika kartalari, birlashgan jadval (kirim/chiqim/to'lov badge'lari bilan), "Kirim/Chiqim qo'shish" modali, Excel import modali (shablon yuklab olish + natija: nechta kirim/chiqim qo'shilgani va qatordagi xatolar)
- [x] i18n (`uz.ts`/`ru.ts`) — `finance.*`, `finance.incomeCategories.*`, `nav.finance`, `export.incomes`, `auditLog.entityIncome`, `trash.tabIncomes` kalitlari
- [x] Backend testlar: `test_incomes.py` (CRUD, summary, soft-delete, dashboard integratsiyasi) va `test_finance.py` (ledger birlashtirish/filtr, import — muvaffaqiyatli, ishoradan tur aniqlash, majburiy ustun yo'qligida xato) — jami 73/73 pytest va frontend build xatosiz o'tdi

---

*Bu fayl loyihaning yagona, yangilanib turadigan ish rejasi hisoblanadi. Yangi vazifalar shu yerga qo'shiladi, bajarilganda `[x]` bilan belgilanadi.*
