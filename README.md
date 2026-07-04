# 💼 Finance Boshqaruv Paneli (WTMA Finance)

Mijozlar bilan tuzilgan xizmat shartnomalari, to'lovlar, qarzdorlik va biznes statistikasini boshqarish uchun ichki B2B panel. Loyiha to'liq ishlab chiqarishga tayyor: autentifikatsiya, ro'llar, Excel/PDF eksport-import, ko'p tillilik (O'zbek/Rus), Docker orqali bir zumda ishga tushirish.

> Bu hujjat loyihani birinchi marta ko'rgan odam (yangi dasturchi, mijoz yoki keyingi jamoa) uchun yozilgan — yuqoridan pastga o'qib chiqsa, loyihani mustaqil ishga tushira oladi va tuzilmasini tushunadi.

---

## Mundarija

1. [Asosiy imkoniyatlar](#-asosiy-imkoniyatlar)
2. [Texnologiya stack](#-texnologiya-stack)
3. [Loyiha strukturasi](#-loyiha-strukturasi)
4. [Ma'lumotlar modeli](#-malumotlar-modeli)
5. [Tezkor ishga tushirish (Docker)](#-tezkor-ishga-tushirish-docker)
6. [Muhit o'zgaruvchilari (.env)](#-muhit-ozgaruvchilari-env)
7. [Docker'siz lokal ishlab chiqish](#-dockersiz-lokal-ishlab-chiqish)
8. [API hujjatlari](#-api-hujjatlari)
9. [Excel import — mijozlar va shartnomalar tarixi](#-excel-import--mijozlar-va-shartnomalar-tarixi)
10. [Testlar](#-testlar)
11. [CI/CD (GitHub Actions)](#-cicd-github-actions)
12. [Production'ga chiqarish](#-productionga-chiqarish)
13. [Rollar va kirish huquqlari](#-rollar-va-kirish-huquqlari)
14. [Ko'p tillilik (i18n)](#-kop-tillilik-i18n)
15. [Nosozliklarni bartaraf etish (Troubleshooting)](#-nosozliklarni-bartaraf-etish-troubleshooting)
16. [Qo'shimcha hujjatlar](#-qoshimcha-hujjatlar)

---

## 🚀 Asosiy imkoniyatlar

| Modul | Tavsif |
|-------|--------|
| **Mijozlar** | Korxonalar bazasi, holat (faol/nofaol), qidiruv, sahifalash, Excel orqali ommaviy import |
| **Shartnomalar** | Bir mijozga bir nechta shartnoma, har birida bir nechta xizmat qatori, muddat, nusxalash |
| **Xizmatni bekor qilish** | Shartnoma ichidagi alohida xizmatni "bekor qilish" (chizib ko'rsatiladi, summadan ayiriladi, qayta faollashtirish mumkin), butun shartnomani bekor qilish |
| **To'lovlar** | Kirim va qaytarish (refund, manfiy summa) turlari, sana bo'yicha filtr |
| **Qarzdorlik** | Har bir mijoz/shartnoma bo'yicha qarz yoki ortiqcha to'lov hisoboti, umumiy statistikasi |
| **Dashboard** | Oylik reja vs fakt, 6/12 oy almashtiriladigan tushum trendi, xizmatlar bo'yicha hajm, top-mijozlar (LTV), muddati yaqinlashayotgan shartnomalar |
| **Excel import** | Ikkita alohida oqim: (1) faqat mijozlar ro'yxatini, (2) to'liq shartnomalar tarixini (mijoz + xizmat + summa + to'lov) — sarlavha nomiga qarab ustunlarni **avtomatik aniqlaydi**, eski Excel fayllarni qayta formatlashsiz yuklash mumkin |
| **Eksport** | Mijozlar/shartnomalar/to'lovlar/qarzdorlik — Excel (`.xlsx`) va PDF formatida, sana filtri bilan |
| **Xodimlar** | Admin/menejer rollari, parolni o'zgartirish, profil sozlamalari |
| **Bildirishnomalar** | Muddati yaqinlashayotgan shartnomalar haqida ogohlantirish |
| **Ko'p tillilik** | To'liq O'zbek va Rus tili qo'llab-quvvatlanadi |
| **Tungi/kunduzgi mavzu** | Dark/Light theme, tanlov saqlanadi |
| **Animatsiyalar** | Framer Motion — sahifa o'tishlari, jadval qatorlari, diagrammalar uchun silliq, minimalist animatsiyalar |

---

## 🧰 Texnologiya stack

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | **FastAPI** (Python 3.12) |
| ORM | **SQLAlchemy 2.0** |
| Ma'lumotlar bazasi | **PostgreSQL 16** |
| Migratsiya | **Alembic** |
| Autentifikatsiya | **JWT** (`python-jose`) + `passlib[bcrypt]` |
| Rate limiting | **slowapi** (login/parol endpointlari uchun) |
| Excel/PDF | **openpyxl**, **reportlab** |
| Frontend | **React 19** + **Vite 6** + **TypeScript** |
| Stil | **Tailwind CSS** + **shadcn/ui** (Base UI asosida) |
| Animatsiya | **Framer Motion** |
| Grafiklar | **Recharts** |
| Marshrutlash | **React Router v7** |
| Testlar | **pytest** (backend), **Playwright** (E2E) |
| Konteynerizatsiya | **Docker** + Docker Compose (dev va prod uchun alohida fayllar) |
| CI | **GitHub Actions** (pytest + frontend build + Playwright E2E) |

---

## 📁 Loyiha strukturasi

```
Finance_managment/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI kirish nuqtasi, CORS, middleware
│   │   ├── config.py               # .env orqali sozlamalar (pydantic-settings)
│   │   ├── database.py             # SQLAlchemy engine/session
│   │   ├── models.py               # Barcha DB modellari + indekslar
│   │   ├── limiter.py              # Rate limiting sozlamasi
│   │   ├── seed.py                 # Admin foydalanuvchi + boshlang'ich xizmat turlari
│   │   ├── api/                    # Har bir resurs uchun alohida router
│   │   │   ├── auth.py, users.py, clients.py, contracts.py,
│   │   │   ├── payments.py, debts.py, dashboard.py, service_types.py,
│   │   │   └── settings.py, notifications.py, export.py, health.py, router.py
│   │   ├── schemas/                # Pydantic request/response modellari
│   │   └── services/               # Biznes mantiq (import, eksport, dashboard hisob-kitoblari)
│   ├── alembic/versions/           # DB migratsiyalar tarixi (001 → 005)
│   ├── tests/                      # pytest testlar (43+ test, conftest.py fixture'lar bilan)
│   ├── Dockerfile                  # Dev va prod uchun bitta image
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Dashboard, Clients, Contracts, Payments, Debts,
│   │   │                           # ServiceTypes, Employees, Profile, Login, ClientCard
│   │   ├── components/             # PageHeader, PremiumDataTable, DateRangePicker,
│   │   │                           # StatCard, Modal, ExportButtons, Layout, ...
│   │   ├── components/ui/          # shadcn/ui asosidagi bazaviy komponentlar
│   │   ├── api/client.ts           # Backendga barcha so'rovlar shu yerda
│   │   ├── context/                # Auth, i18n, Preferences (tema/til) kontekstlari
│   │   ├── i18n/locales/           # uz.ts, ru.ts — barcha matnlar
│   │   └── types/index.ts          # TypeScript interfeyslar (backend sxemalariga mos)
│   ├── e2e/                        # Playwright end-to-end testlar
│   ├── Dockerfile / Dockerfile.prod  # Dev (vite) va prod (nginx) uchun alohida image
│   └── package.json
├── docs/
│   ├── adr/                        # Arxitektura qarorlari (ADR)
│   └── agents/issue-tracker.md     # Ish/bug kuzatuv jadvali
├── docker-compose.yml              # Dev muhit (hot-reload)
├── docker-compose.prod.yml         # Production muhit (nginx + uvicorn workers + Caddy HTTPS)
├── Caddyfile                       # HTTPS reverse proxy konfiguratsiyasi (Let's Encrypt)
├── .env.example / .env.prod.example
├── PLAN.md                         # Loyihaning to'liq, tarixiy ish rejasi (nima qilingani)
├── CONTEXT.md                      # Domain lug'ati (AI agentlar uchun ham foydali)
└── AGENTS.md                       # Agent/skill konfiguratsiyasi
```

---

## 🗄️ Ma'lumotlar modeli

```mermaid
erDiagram
    CLIENT ||--o{ CONTRACT : "bitta mijozning ko'p shartnomasi"
    CONTRACT ||--o{ CONTRACT_LINE_ITEM : "shartnoma ichidagi xizmatlar"
    CONTRACT ||--o{ PAYMENT : "to'lovlar (kirim/refund)"
    SERVICE_TYPE ||--o{ CONTRACT_LINE_ITEM : "xizmat turi katalogi"

    CLIENT {
        int id PK
        string company_name
        string contact_person
        string phone
        string status "faol / nofaol"
    }
    CONTRACT {
        int id PK
        int client_id FK
        date start_date
        date end_date
        string contract_number "ixtiyoriy, masalan №1"
        string invoice_number "ЭСФ raqami, ixtiyoriy"
    }
    CONTRACT_LINE_ITEM {
        int id PK
        int contract_id FK
        int service_type_id FK
        decimal price
        bool is_cancelled
    }
    PAYMENT {
        int id PK
        int contract_id FK
        decimal amount "manfiy = refund"
        date paid_at
    }
    SERVICE_TYPE {
        int id PK
        string name
        bool is_active
    }
```

**Asosiy biznes qoidalar:**

- `total_amount` = shartnomadagi bekor qilinmagan xizmat qatorlari yig'indisi.
- `paid_amount` = shartnoma bo'yicha barcha to'lovlar yig'indisi (refund manfiy summa sifatida ayiriladi).
- `debt_amount = total_amount − paid_amount`. Agar natija **manfiy** bo'lsa — bu "ortiqcha to'lov" (UI'da yashil rangda ko'rsatiladi).
- Xizmat qatori bekor qilinsa — oldingi to'lovlar saqlanadi, faqat summa qayta hisoblanadi (agar ortiqcha to'lov paydo bo'lsa, manfiy summali "refund" to'lovi yozib qo'yiladi).
- Barcha xizmat qatorlari bekor qilinsa — shartnomaning o'zi ham "bekor qilingan" deb belgilanadi.

**DB indekslari** (tez qidiruv/hisobot uchun):

| Jadval | Indeks |
|--------|--------|
| `clients` | `status`, `company_name`, `city` |
| `contracts` | `client_id`, `start_date`, `end_date`, `(start_date, end_date)` |
| `contract_line_items` | `contract_id`, `service_type_id` |
| `payments` | `contract_id`, `paid_at`, `(contract_id, paid_at)` |
| `service_types` | `name` (unique) |

---

## ⚡ Tezkor ishga tushirish (Docker)

Talab qilinadi: **Docker Desktop** (yoki Docker Engine + Compose plugin).

```bash
# 1. Repozitoriyni klonlash
git clone <repo-url> Finance_managment
cd Finance_managment

# 2. (Ixtiyoriy) muhit faylini sozlash — sozlamasangiz ham default qiymatlar ishlaydi
cp .env.example .env

# 3. Konteynerlarni ishga tushirish
docker compose up --build
```

Birinchi marta ishga tushganda avtomatik ravishda:
1. PostgreSQL konteyneri ko'tariladi va sog'lom (healthy) bo'lguncha kutiladi;
2. `alembic upgrade head` — barcha migratsiyalar qo'llanadi;
3. `python -m app.seed` — admin foydalanuvchi va boshlang'ich xizmat turlari yaratiladi;
4. Backend (`uvicorn --reload`) va frontend (`vite dev --host`) ishga tushadi.

**Manzillar:**

| Xizmat | URL |
|--------|-----|
| 🖥️ Panel (UI) | http://localhost:3000 |
| 🔌 Backend API | http://localhost:8002 |
| 📚 Swagger (interaktiv API hujjat) | http://localhost:8002/docs |
| 🗄️ PostgreSQL (host'dan) | `localhost:5433` |

**Standart kirish:** login `admin`, parol `admin123` (production'da albatta o'zgartiring — pastga qarang).

Konteynerlarni to'xtatish: `docker compose down` (ma'lumotlar `postgres_data` volume'da saqlanib qoladi). Bazani ham tozalash: `docker compose down -v`.

---

## 🔑 Muhit o'zgaruvchilari (.env)

`.env.example` faylini nusxalab, kerak bo'lsa qiymatlarni o'zgartiring:

| O'zgaruvchi | Standart qiymat | Tavsif |
|-------------|------------------|--------|
| `DATABASE_URL` | `postgresql://finance:finance@localhost:5433/finance_db` | PostgreSQL ulanish satri |
| `JWT_SECRET` | — (majburiy) | JWT tokenlarni imzolash uchun maxfiy kalit — **production'da uzun, tasodifiy qiymat qo'ying** |
| `ADMIN_USERNAME` | `admin` | Birinchi marta seed qilinadigan admin login |
| `ADMIN_PASSWORD` | `111` | Admin paroli — **production'da albatta o'zgartiring** |
| `ADMIN_FULL_NAME` | `Administrator` | Admin foydalanuvchi to'liq ismi |
| `MONTHLY_PLAN` | `50000000` | Dashboard'dagi oylik reja summasi (keyinchalik UI orqali ham o'zgartiriladi) |

Qo'shimcha (kod ichida standart qiymati bor, `.env`ga yozish shart emas): `JWT_ALGORITHM` (`HS256`), `JWT_EXPIRE_MINUTES` (`480`), `RATE_LIMIT_ENABLED`, `LOGIN_RATE_LIMIT` (`10/minute`), `CHANGE_PASSWORD_RATE_LIMIT` (`5/minute`).

Production uchun alohida `.env.prod.example` mavjud ([Production'ga chiqarish](#-productionga-chiqarish) bo'limiga qarang).

---

## 🛠️ Docker'siz lokal ishlab chiqish

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# PostgreSQL lokal yoki Docker'da ishlab turishi kerak, .env da DATABASE_URL to'g'rilang
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Backend: http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000 (Vite dev-server API so'rovlarini backend'ga proksi qiladi).

---

## 📖 API hujjatlari

To'liq, interaktiv hujjat: **http://localhost:8002/docs** (Swagger UI, avtomatik generatsiya qilinadi).

Asosiy resurslar (`/api/v1` prefiksi bilan):

| Resurs | Endpoint'lar |
|--------|-------------|
| **Auth** | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| **Clients** | `GET/POST /clients`, `GET/PATCH/DELETE /clients/{id}`, `GET /clients/{id}/card`, `GET /clients/import-template`, `POST /clients/import` |
| **Contracts** | `GET/POST /contracts`, `GET/PATCH/DELETE /contracts/{id}`, `POST /contracts/{id}/duplicate`, `PATCH /contracts/{id}/line-items/{id}/cancel`\|`reactivate`, `POST /contracts/{id}/cancel-all`, `GET /contracts/import-template`, `POST /contracts/import` |
| **Payments** | `GET/POST /payments`, `GET/DELETE /payments/{id}` |
| **Debts** | `GET /debts` (qidiruv parametri bilan) |
| **Dashboard** | `GET /dashboard`, `GET /dashboard/top-clients`, `GET /dashboard/revenue-trend` |
| **Service types** | `GET/POST /service-types`, `GET/PATCH/DELETE /service-types/{id}` |
| **Users** | `GET/POST /users`, `PATCH /users/{id}` (faqat admin) |
| **Settings** | `GET /settings`, `PATCH /settings/monthly-plan` |
| **Notifications** | `GET /notifications/expiring-contracts` |
| **Export** | `GET /export/{resource}` (`clients`\|`contracts`\|`payments`\|`debts`, format=`xlsx`\|`pdf`) |
| **Health** | `GET /health` |

---

## 📊 Excel import — mijozlar va shartnomalar tarixi

Loyihada **ikkita** alohida import oqimi bor, chunki ular turli maqsadga xizmat qiladi:

### 1) Faqat mijozlar ro'yxati — `Clients` sahifasi
Yangi mijozlarni (kompaniya, kontakt shaxs, telefon, holat va h.k.) ommaviy qo'shish uchun. Shablonni yuklab oling, to'ldiring, qayta yuklang.

### 2) To'liq shartnomalar tarixi — `Contracts` sahifasi
Eski Excel jadvalingizdagi **haqiqiy tarixiy ma'lumotlarni** (kim bilan, qaysi xizmatga, qancha summaga shartnoma tuzilgan va qanchasi to'langan) bazaga bir yo'la ko'chirish uchun.

**Muhim: ustunlar tartibi muhim emas.** Tizim sarlavha (birinchi qator) matniga qarab ustunlarni avtomatik taniydi — o'zbekcha yoki ruscha, istalgan tartibda:

| Aniqlanadigan maydon | Sarlavhada qidiriladigan so'zlar (misollar) |
|---|---|
| Kompaniya (majburiy) | "Компания", "Наименование предприятия", "Kompaniya", "Korxona" |
| Xizmat (majburiy) | "Услуга", "Xizmat" |
| Shartnoma raqami/sanasi | "Договор", "Shartnoma" (masalan: `№1 от 23.01.2026`) |
| Summa (majburiy) | "Сумма", "Summa" |
| To'langan summa | "Поступление", "To'landi", "Оплата" |
| ЭСФ / izoh | "ЭСФ", "НДС" |

**Avtomatik hisob-kitob mantig'i:**
- Har bir qator — alohida shartnoma. Mijoz kompaniya nomi bo'yicha topiladi yoki avtomatik yaratiladi (shu sababli bitta kompaniyaning barcha eski shartnomalari uning mijoz kartasida yig'iladi).
- Xizmat turi ham nomi bo'yicha topiladi yoki avtomatik yaratiladi.
- **Summa == To'langan summa** bo'lsa → qarz avtomatik `0` (to'liq yopilgan) hisoblanadi — rangga qarab emas, aynan shu solishtiruvga tayaniladi.
- Agar "To'landi" ustuni bo'sh qoldirilgan-u, "Долг" ustunida "готово"/"tayyor" kabi holat yozilgan bo'lsa — bu ham to'liq to'lov sifatida qabul qilinadi.
- Bir xil mijoz + bir xil shartnoma raqami qayta yuklansa — qatordan **o'tkazib yuboriladi** va natija oynasida alohida "takroriy" ro'yxatida ko'rsatiladi (ma'lumot ikki marta yozilib qolmasligi uchun).
- Qator xato bo'lsa (masalan kompaniya nomi yo'q, summa noto'g'ri) — u ham o'tkazib yuboriladi va aniq xato matni bilan alohida ro'yxatda chiqadi.

---

## ✅ Testlar

### Backend (pytest)

```bash
# Docker orqali (tavsiya etiladi)
docker compose exec api python -m pytest -q

# Docker'siz
cd backend
pip install -r requirements-dev.txt
pytest -q
```

43+ test: autentifikatsiya, mijozlar, shartnomalar (yaratish, bekor qilish, import), to'lovlar, qarzdorlik, dashboard, sog'liq tekshiruvi (`test_*.py` fayllari, `conftest.py`da umumiy fixture'lar — izolyatsiyalangan test bazasi bilan ishlaydi).

### Frontend build tekshiruvi (TypeScript)

```bash
docker compose exec web npm run build
# yoki lokal: cd frontend && npm run build
```

### End-to-End (Playwright)

```bash
cd frontend
npm run test:e2e       # headless
npm run test:e2e:ui    # interaktiv UI rejimda
```

E2E testlar login, navigatsiya va to'liq biznes oqimini (mijoz → shartnoma → to'lov) tekshiradi (`frontend/e2e/`).

---

## 🔄 CI/CD (GitHub Actions)

`.github/workflows/ci.yml` har bir push/PR'da (`main`/`master`) uchta ishni ketma-ket bajaradi:

1. **Backend tests** — `pytest` (Python 3.12);
2. **Frontend build** — `tsc -b && vite build` (Node 20);
3. **E2E (Playwright)** — to'liq Docker stack ko'tarib, brauzerda haqiqiy senariylarni tekshiradi.

---

## 🌐 Production'ga chiqarish

Production uchun alohida compose fayli va optimallashtirilgan image'lar tayyorlangan:

```bash
cp .env.prod.example .env.prod
# .env.prod ichida JWT_SECRET, POSTGRES_PASSWORD, ADMIN_PASSWORD qiymatlarini
# albatta kuchli, tasodifiy qiymatlarga almashtiring!

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Farqlari:
- Backend `uvicorn --workers 2` bilan ishga tushadi (`--reload` yo'q);
- Frontend `Dockerfile.prod` orqali build qilinib, **nginx** (`nginx.conf`) orqali statik fayl sifatida xizmat qiladi va API so'rovlarini backend'ga proksi qiladi;
- Barcha konteynerlar `restart: unless-stopped`;
- Maxfiy kalitlar `.env.prod`dan majburiy o'qiladi (bo'sh bo'lsa compose xato beradi — shu orqali standart parol bilan production'ga chiqib ketish oldini oladi).

**HTTPS**: `docker-compose.prod.yml` tarkibiga **Caddy** reverse proxy qo'shilgan — u avtomatik ravishda Let's Encrypt orqali TLS sertifikat oladi/yangilaydi va HTTP so'rovlarini HTTPS'ga yo'naltiradi, qo'shimcha qo'lda sozlash shart emas:

1. Domeningizning DNS'ida A yozuvi shu server IP manziliga yo'naltirilgan bo'lishi kerak;
2. `.env.prod` faylida `DOMAIN` (masalan `finance.example.com`) va `ACME_EMAIL` qiymatlarini to'ldiring;
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` — Caddy birinchi so'rovda avtomatik sertifikat oladi.

Domen hali bo'lmasa, `.env.prod`da `DOMAIN=localhost` qoldiring — Caddy ichki (self-signed) sertifikat bilan ishlaydi (faqat lokal sinov uchun, brauzer ishonchsiz sertifikat haqida ogohlantiradi — bu kutilgan holat). Konfiguratsiya `Caddyfile` faylida.

---

## 👤 Rollar va kirish huquqlari

| Login | Parol (dev) | Rol |
|-------|-------------|-----|
| `admin` | `admin123` (yoki `.env`dagi `ADMIN_PASSWORD`) | **Admin** |

**Rollar:**

- **admin** — barcha funksiyalar + xodimlar (foydalanuvchilar) boshqaruvi, oylik reja sozlash;
- **menejer** — mijozlar, shartnomalar, to'lovlar bilan ishlaydi, lekin xodim qo'sha olmaydi va tizim sozlamalarini o'zgartira olmaydi.

Yangi xodim qo'shish: **Profil → Xodimlar** (faqat admin ko'radi) yoki `POST /api/v1/users`.

---

## 🌍 Ko'p tillilik (i18n)

Barcha matnlar `frontend/src/i18n/locales/uz.ts` va `ru.ts` fayllarida saqlanadi. Yangi matn qo'shish tartibi:

1. `uz.ts` ga kalit va o'zbekcha tarjimani qo'shing;
2. `ru.ts` ga xuddi shu kalitning ruscha tarjimasini qo'shing;
3. Komponentda `const { t } = useI18n();` va `t("bo'lim.kalit")` orqali chaqiring.

Til/tema tanlovi `PreferencesContext` orqali `localStorage`da saqlanadi, sahifa yangilanganda yo'qolmaydi.

---

## 🩺 Nosozliklarni bartaraf etish (Troubleshooting)

| Muammo | Yechim |
|--------|--------|
| `docker compose` buyrug'i ishlamayapti | Docker Desktop ochilganini va ishga tushganini tekshiring |
| API `500` xato qaytaryapti, jadval yo'q deb yozadi | Migratsiya qo'llanmagan bo'lishi mumkin: `docker compose exec api alembic upgrade head` |
| Yangi migratsiya qo'shdim, lekin baza eski | Konteyner qayta ishga tushganda avtomatik qo'llanadi, lekin ishlab turgan konteynerda qo'lda ishga tushiring (yuqoridagi buyruq) |
| Portlar band (3000/8002/5433) | `docker-compose.yml`dagi port raqamlarini o'zgartiring yoki band qilgan jarayonni to'xtating |
| `bcrypt has no attribute '__about__'` ogohlantirishi | Zararsiz — `passlib`/`bcrypt` versiyalari orasidagi kutubxona ogohlantirishi, ishlashga ta'sir qilmaydi |
| Excel import "Ustunlar aniqlanmadi" xatosi beryapti | Fayl sarlavha (1-qator) matnini tekshiring — kamida "Kompaniya/Компания", "Xizmat/Услуга" va "Summa/Сумма" so'zlariga mos ustun bo'lishi kerak |
| Frontend o'zgarishlari ko'rinmayapti | Dev rejimida hot-reload ishlaydi; ko'rinmasa konteynerni qayta ishga tushiring: `docker compose restart web` |

---

## 📚 Qo'shimcha hujjatlar

- [`PLAN.md`](./PLAN.md) — loyihaning to'liq, xronologik ish rejasi (nima qachon qilingani, batafsil)
- [`CONTEXT.md`](./CONTEXT.md) — domen lug'ati (asosiy tushunchalar, qisqacha)
- [`AGENTS.md`](./AGENTS.md) — AI agent/skill konfiguratsiyasi (Cursor uchun)
- [`docs/adr/`](./docs/adr/) — arxitektura qarorlari (ADR)
- [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) — ish/bug kuzatuv jadvali

---

*Savol yoki muammo bo'lsa — avval shu README va `PLAN.md` faylini tekshiring, ular loyihaning to'liq tarixi va joriy holatini aks ettiradi.*
