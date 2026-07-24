# Finance Boshqaruv Paneli (WTMA Finance)

Mijozlar, shartnomalar, to'lovlar, qarzdorlik, moliya (kirim/chiqim) va biznes statistikasini boshqarish uchun ichki **B2B moliyaviy panel**. Loyiha production'ga chiqarishga tayyor: JWT autentifikatsiya, admin/menejer rollari, soft-delete + arxiv, audit jurnali, Excel/PDF eksport-import, ko'p tillilik (O'zbek/Rus), Docker orqali bir zumda ishga tushirish.

> Bu hujjat loyihani birinchi marta ko'rgan dasturchi, moliyachi yoki keyingi jamoa uchun yozilgan — yuqoridan pastga o'qib chiqsa, loyihani mustaqil ishga tushira oladi va tuzilmasini tushunadi.

**Repozitoriy:** [github.com/SunnatDevPy/Finance_kpi](https://github.com/SunnatDevPy/Finance_kpi)

---

## Mundarija

1. [Asosiy imkoniyatlar](#-asosiy-imkoniyatlar)
2. [Texnologiya stack](#-texnologiya-stack)
3. [Loyiha strukturasi](#-loyiha-strukturasi)
4. [Ma'lumotlar modeli](#-malumotlar-modeli)
5. [Tezkor ishga tushirish (Docker)](#-tezkor-ishga-tushirish-docker)
6. [Muhit o'zgaruvchilari](#-muhit-ozgaruvchilari-env)
7. [Docker'siz lokal ishlab chiqish](#-dockersiz-lokal-ishlab-chiqish)
8. [API hujjatlari](#-api-hujjatlari)
9. [Excel import](#-excel-import)
10. [Rollar va kirish huquqlari (RBAC)](#-rollar-va-kirish-huquqlari-rbac)
11. [Ko'p tillilik (i18n)](#-kop-tillilik-i18n)
12. [Testlar va verify](#-testlar-va-verify)
13. [CI/CD](#-cicd-github-actions)
14. [Production'ga chiqarish](#-productionga-chiqarish)
15. [Agent / skill workflow](#-agent--skill-workflow)
16. [Keyingi qadamlar — nima yetishmayapti](#-keyingi-qadamlar--nima-yetishmayapti)
17. [Nosozliklarni bartaraf etish](#-nosozliklarni-bartaraf-etish-troubleshooting)
18. [Qo'shimcha hujjatlar](#-qoshimcha-hujjatlar)

---

## Asosiy imkoniyatlar

### Mijozlar (`/clients`)

| Imkoniyat | Tavsif |
|-----------|--------|
| CRUD | Korxona bazasi, kontakt, telefon, shahar, holat (`faol` / `nofaol`) |
| Qidiruv va filtr | Qidiruv, shahar, holat, **qarz filtri** (barchasi / faqat qarzdorlar / qarzi yo'q / ortiqcha to'langan) |
| Qarz ustuni | Har bir mijozning umumiy qarzi (`total_debt`) |
| Mijoz kartasi | `/clients/:id` — shartnomalar, to'lovlar tarixi, yangi kontrakt/to'lov |
| Logotip | PNG/JPEG/WEBP/SVG yuklash (5 MB gacha) |
| Excel import | Shablon orqali ommaviy mijoz qo'shish |
| Eksport | Excel/PDF, bulk export (tanlangan ID'lar) |

### Shartnomalar (`/contracts`)

| Imkoniyat | Tavsif |
|-----------|--------|
| Ko'p qatorli xizmatlar | Bir shartnomada bir nechta `line_item`, har biri xizmat turi + narx |
| Workflow holati | `yangi` → `davom_etmoqda` → `tugadi` / `toxtatildi` (faqat **tahrirlash oynasida** o'zgartiriladi) |
| Qator rang-kodlash | Holat bo'yicha pastel fon (Sheets uslubi) |
| Shartnoma raqami, ЭСФ | `contract_number`, `invoice_number` |
| Xizmatni bekor qilish | Alohida qator yoki butun shartnoma; qayta faollashtirish |
| Nusxalash, PDF hujjatlar | Schyot-faktura, akt, shartnoma PDF |
| Filtrlar | Qidiruv, sana oralig'i, workflow holati, qarz filtri, **xizmat turi** |
| Bulk | Tanlanganlarni eksport / arxivga o'tkazish |
| Excel import | Eski Excel tarixini moslashuvchan ustun aniqlash bilan yuklash |

### To'lovlar (`/payments`)

| Imkoniyat | Tavsif |
|-----------|--------|
| Kirim va refund | Manfiy summa = qaytarish (qizil rangda) |
| Qo'shish | Modal orqali; "Saqlash va yana qo'shish" |
| **Tahrirlash** | Summa, sana, izohni tuzatish (adashib 0 yoki noto'g'ri yozilgan bo'lsa) — o'zgarishlar audit jurnaliga yoziladi |
| Filtrlar | Sana, qidiruv (mijoz, shartnoma raqami, telefon) |
| Bulk arxiv / eksport | Checkbox tanlash (arxiv — faqat admin) |

### Moliya (`/finance`)

| Imkoniyat | Tavsif |
|-----------|--------|
| **Yillik daromad** | Tepada alohida chiziqli diagramma (2019 — joriy yil): mijoz to'lovlari va chiqimlar |
| **Oborot** | Yil filtri (2019–2035, **Barcha yillar**), davr (butun yil / 1–4 chorak) |
| KPI kartalar | **Jami tushum** (faqat mijoz to'lovlari), **Jami chiqim**, **Sof balans** |
| Xarajatlar taqsimoti | Qaysi kategoriya ko'p ekanligi (bar chart) |
| Birlashgan ledger | Mijoz to'lovlari + boshqa kirimlar + xarajatlar bitta jadvalda |
| Kirim / chiqim | Izoh orqali kiritiladi (alohida "Nomi" maydoni yo'q) |
| To'lov tahriri | Ledgerdagi mijoz to'lovlarini qalamcha bilan tuzatish |
| Excel import | Eski moliya tarixini yuklash |

### Qarzdorlik

| Imkoniyat | Tavsif |
|-----------|--------|
| Mijozlar filtri | `Faqat qarzdorlar` — alohida sahifa yo'q, `/clients?debtors=1` |
| Kontraktlar filtri | `Qarz bor` — `/contracts?has_debt=1` |
| API `/debts` | Dashboard eksport va umumiy statistika uchun saqlanadi |
| Eski `/debts` URL | Avtomatik `/clients?debtors=1` ga yo'naltiriladi |

### Dashboard (`/`)

| Imkoniyat | Tavsif |
|-----------|--------|
| KPI kartalar | Umumiy qarz, oylik tushum, reja vs fakt |
| Diagrammalar | Mijozlar holati (donut), shartnomalar holati (donut), daromad trendi (6/12 oy) |
| Xizmatlar bo'yicha | Barcha xizmat turlari alohida ko'rsatiladi (faqat "Boshqalar" emas) |
| Top mijozlar (LTV) | To'lovlar bo'yicha reyting |
| Muddati yaqin shartnomalar | Sozlanadigan kunlar (`notifyDays`) |
| Tezkor tahlil | Xizmatlar bo'yicha hajm, balans progress |

### Xizmat turlari (`/service-types`)

Katalog CRUD, faol/nofaol filtri, nom tahrirlash, statistika. **Create/update/delete — faqat admin.**

### Xodimlar (`/employees`) — admin

Foydalanuvchi CRUD, rol (`admin` / `menejer`), faollashtirish/bloklash, tahrirlash modali, audit tarixiga link.

### Arxiv (`/trash`) — admin

Soft-delete qilingan yozuvlar: mijoz, kontrakt, to'lov, xarajat, kirim. Qidiruv, sahifalash, tiklash.

### O'zgarishlar tarixi (`/audit-log`) — admin

Kim, qachon, nima o'zgartirgan — entity turi, ID, sana filtri. Tahrirlangan maydonlar diff ko'rinishida (`Summa: 100000 → 250000`). Arxivga o'tkazilgan yozuvlar uchun **Tiklash** tugmasi (mijoz, shartnoma, to'lov, kirim, chiqim).

### Profil (`/profile`)

Parol o'zgartirish, til/mavzu, bildirishnoma kunlari, oylik reja (admin), kompaniya rekvizitlari (PDF hujjatlar uchun), kirish tarixi.

### Bildirishnomalar (header)

| Tur | Tavsif |
|-----|--------|
| Muddati yaqin shartnomalar | `NotificationBell` dropdown |
| Muddati o'tgan qarzlar | Overdue debts bo'limi |
| Toast (splavayushiy) | Yaratish/yangilash/o'chirish amallarida yuqori o'ngda, max **4 ta** |

### UI/UX

- B2B minimalist dizayn (Tailwind + shadcn/ui)
- Framer Motion animatsiyalar (60 FPS, subtle)
- Dark / Light mavzu
- **PWA / mobil** — o'rnatiladigan ilova, offline shell, safe-area (notch), mobil o'rnatish banneri
- Mobil sidebar (drawer)
- Global qidiruv (header)
- Filtrlar `localStorage`da saqlanadi
- Sessiya tugaganda (401) login sahifasida ogohlantirish

---

## Texnologiya stack

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | **FastAPI** (Python 3.12) |
| ORM | **SQLAlchemy 2.0** |
| Ma'lumotlar bazasi | **PostgreSQL 16** |
| Migratsiya | **Alembic** (001 → 011) |
| Autentifikatsiya | **JWT** + `passlib[bcrypt]` |
| Rate limiting | **slowapi** (login, parol) |
| Excel/PDF | **openpyxl**, **reportlab** (DejaVu shrift) |
| Frontend | **React 19** + **Vite 6** + **TypeScript** |
| UI | **Tailwind CSS** + **shadcn/ui** (Base UI) |
| Animatsiya | **Framer Motion** |
| Grafiklar | **Recharts** |
| Marshrutlash | **React Router v7** |
| Testlar | **pytest** (~102), **Playwright** (E2E) |
| Konteyner | **Docker Compose** (dev + prod) |
| HTTPS (prod) | **Caddy** (Let's Encrypt) |
| CI | **GitHub Actions** |

---

## Loyiha strukturasi

```
Finance_managment/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI, CORS, middleware
│   │   ├── config.py               # pydantic-settings (.env)
│   │   ├── models.py               # SQLAlchemy modellari
│   │   ├── seed.py                 # Admin + boshlang'ich xizmat turlari
│   │   ├── api/                    # REST routerlar
│   │   │   ├── auth.py, users.py, clients.py, contracts.py
│   │   │   ├── payments.py, expenses.py, incomes.py, finance.py
│   │   │   ├── debts.py, dashboard.py, service_types.py
│   │   │   ├── settings.py, notifications.py, export.py
│   │   │   ├── audit.py, health.py
│   │   ├── schemas/                # Pydantic modellari
│   │   └── services/               # Biznes mantiq
│   │       ├── contract_import.py, client_import.py, finance import
│   │       ├── debts.py, debt_queries.py, documents.py, audit.py
│   │       └── export_*.py, dashboard hisob-kitoblari
│   ├── alembic/versions/           # 001 … 011 migratsiyalar
│   ├── tests/                      # pytest (16 fayl, ~83 test)
│   ├── uploads/                    # Mijoz logotiplari (dev)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Dashboard, Clients, ClientCard, Contracts,
│   │   │                           # Payments, Finance, ServiceTypes, Employees,
│   │   │                           # Profile, Trash, AuditLog, Login
│   │   ├── components/             # Layout, PremiumDataTable, StatCard, Modal,
│   │   │                           # PaymentEditModal, QuickPaymentModal, …
│   │   ├── components/ui/          # shadcn/ui komponentlar
│   │   ├── api/client.ts           # Barcha API so'rovlari + toast integratsiyasi
│   │   ├── context/                # Auth, I18n, Preferences, Theme
│   │   ├── hooks/                  # usePersistedState, useMoneyInput, …
│   │   ├── lib/                    # mutationToast, toastBus, dateRange, …
│   │   ├── i18n/locales/           # uz.ts, ru.ts
│   │   └── types/index.ts
│   ├── e2e/                        # Playwright testlar
│   ├── Dockerfile / Dockerfile.prod
│   └── package.json
├── docs/
│   ├── adr/                        # Arxitektura qarorlari
│   └── agents/issue-tracker.md
├── .cursor/skills/                 # wtma-verify, wtma-frontend, wtma-backend, …
├── docker-compose.yml              # Dev (hot-reload)
├── docker-compose.prod.yml         # Prod (nginx + Caddy HTTPS)
├── Caddyfile
├── .env.example / .env.prod.example
├── PLAN.md                         # To'liq ish tarixi (xronologik)
├── CONTEXT.md                      # Domain lug'ati
├── AGENTS.md                       # Agent skill konfiguratsiyasi
└── README.md                       # ← Siz shu yerdasiz
```

---

## Ma'lumotlar modeli

```mermaid
erDiagram
    CLIENT ||--o{ CONTRACT : has
    CONTRACT ||--o{ CONTRACT_LINE_ITEM : contains
    CONTRACT ||--o{ PAYMENT : receives
    SERVICE_TYPE ||--o{ CONTRACT_LINE_ITEM : typed

    CLIENT {
        int id PK
        string company_name
        string status "faol|nofaol"
        string logo_path
        datetime deleted_at
    }
    CONTRACT {
        int id PK
        int client_id FK
        date start_date end_date
        string contract_number invoice_number
        string status "yangi|davom_etmoqda|tugadi|toxtatildi"
        datetime deleted_at
    }
    CONTRACT_LINE_ITEM {
        int id PK
        decimal price
        bool is_cancelled
    }
    PAYMENT {
        int id PK
        decimal amount "manfiy=refund"
        date paid_at
        datetime deleted_at
    }
    EXPENSE { int id PK string category decimal amount }
    INCOME { int id PK string category decimal amount }
    USER { int id PK string role "admin|menejer" }
    AUDIT_LOG { int id PK string action entity_type }
```

### Asosiy biznes qoidalari

- `total_amount` = bekor qilinmagan xizmat qatorlari yig'indisi
- `paid_amount` = shartnoma bo'yicha barcha to'lovlar (refund manfiy)
- `debt_amount = total_amount − paid_amount` (manfiy = ortiqcha to'lov)
- Soft-delete: `deleted_at` — arxivdan tiklash mumkin
- Har bir CRUD amal `audit_log` jadvaliga yoziladi

---

## Tezkor ishga tushirish (Docker)

**Talab:** Docker Desktop yoki Docker Engine + Compose.

```bash
git clone https://github.com/SunnatDevPy/Finance_kpi.git Finance_managment
cd Finance_managment

# Ixtiyoriy — default qiymatlar ham ishlaydi
cp .env.example .env

docker compose up --build
```

Birinchi ishga tushishda avtomatik:
1. PostgreSQL healthy bo'lguncha kutadi
2. `alembic upgrade head`
3. `python -m app.seed` (admin + xizmat turlari)
4. Backend `uvicorn --reload` + Frontend `vite dev`

| Xizmat | URL |
|--------|-----|
| Panel (UI) | http://localhost:5173 |
| Backend API | http://localhost:8002 |
| Swagger | http://localhost:8002/docs |
| PostgreSQL | `localhost:5433` |

**Dev kirish:** `admin` / `admin123` (`docker-compose.yml` dagi default)

To'xtatish: `docker compose down` · Bazani tozalash: `docker compose down -v`

---

## Muhit o'zgaruvchilari (.env)

| O'zgaruvchi | Standart | Tavsif |
|-------------|----------|--------|
| `DATABASE_URL` | `postgresql://finance:finance@localhost:5433/finance_db` | PostgreSQL |
| `JWT_SECRET` | — | **Production'da majburiy**, uzun tasodifiy qiymat |
| `ADMIN_USERNAME` | `admin` | Seed admin login |
| `ADMIN_PASSWORD` | `1111` (.env.example) | Seed parol — **prod'da o'zgartiring** |
| `ADMIN_FULL_NAME` | `Administrator` | Admin ismi |
| `MONTHLY_PLAN` | `50000000` | Dashboard oylik reja (UI orqali ham o'zgartiriladi) |

Qo'shimcha (kod ichida default): `JWT_EXPIRE_MINUTES=480`, `LOGIN_RATE_LIMIT=10/minute`.

Production: `.env.prod.example` → [Production](#-productionga-chiqarish)

---

## Docker'siz lokal ishlab chiqish

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt -r requirements-dev.txt

# PostgreSQL ishlab turishi kerak (port 5433 yoki DATABASE_URL)
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend http://localhost:5173 (Docker) yoki `npm run dev` — Vite API so'rovlarini `8002` (Docker) yoki `8000` (lokal) ga proksi qiladi (`vite.config.ts`).

---

## API hujjatlari

Interaktiv: **http://localhost:8002/docs**

Barcha endpointlar `/api/v1` prefiksi ostida.

| Modul | Asosiy endpointlar |
|-------|-------------------|
| **Auth** | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| **Clients** | CRUD, `GET /clients/{id}/card`, logo, import, trash/restore |
| **Contracts** | CRUD, duplicate, line-item cancel/reactivate, cancel-all, confirm/complete, documents (PDF), import |
| **Payments** | CRUD (tahrirlash + audit), trash/restore |
| **Expenses** | CRUD, summary, trash/restore |
| **Incomes** | CRUD, summary, trash/restore |
| **Finance** | `GET /finance/ledger`, `GET /finance/turnover?year=&period=`, `GET /finance/turnover-trend`, import |
| **Debts** | `GET /debts` (hisobot/eksport) |
| **Dashboard** | `GET /dashboard`, top-clients, revenue-trend |
| **Service types** | CRUD, stats |
| **Users** | CRUD (admin) |
| **Settings** | monthly-plan, company-profile |
| **Notifications** | expiring-contracts, overdue-debts |
| **Audit** | `GET /audit/log`, login-history; tarixdan tiklash (UI) |
| **Export** | `GET /export/{resource}?format=xlsx\|pdf` |
| **Health** | `GET /health` |

**Filtr parametrlari (misollar):**
- `GET /clients?debt_filter=debtors|no_debt|overpaid`
- `GET /contracts?status=yangi&debt_filter=debtors`
- `GET /contracts?date_from=...&date_to=...`

---

## Excel import

### 1) Mijozlar — `Clients` sahifasi

Kompaniya, kontakt, telefon, holat. Takroriy korxonalar o'tkazib yuboriladi.

### 2) Shartnomalar tarixi — `Contracts` sahifasi

Eski Excel jadvalingizdagi tarixni bir yo'la ko'chirish. **Ustunlar tartibi muhim emas** — sarlavha matniga qarab aniqlanadi (o'zbek/rus).

| Maydon | Sarlavha kalitlari |
|--------|-------------------|
| Kompaniya | Kompaniya, Korxona, Компания, Наименование предприятия |
| Xizmat | Xizmat, Услуга |
| Shartnoma | Shartnoma, Договор (№1 от 23.01.2026) |
| Summa | Summa, Сумма |
| To'langan | To'landi, Поступление, Оплата |
| ЭСФ | ЭСФ, НДС |

**Qoidalar:** Summa = To'langan → qarz 0; takroriy mijoz+shartnoma raqami o'tkazib yuboriladi.

### 3) Moliya tarixi — `Finance` sahifasi

Sana, tur (kirim/chiqim), summa, kategoriya, izoh. Shablon yuklab olish mumkin.

### Moliya oborot API (qisqacha)

| Parametr | Qiymat | Ma'nosi |
|----------|--------|---------|
| `year` | `2026` yoki `all` | Yil yoki barcha yillar (2019–2035) |
| `period` | `full`, `q1`–`q4` | Butun yil yoki chorak |
| `year_from` / `year_to` | `2019` / joriy yil | Yillik daromad diagrammasi oralig'i |

---

## Rollar va kirish huquqlari (RBAC)

| Rol | Huquqlar |
|-----|----------|
| **admin** | Hamma narsa + xodimlar, arxiv, audit, oylik reja, kompaniya profili, **o'chirish/arxiv** |
| **menejer** | Mijozlar, shartnomalar, to'lovlar, moliya ko'rish/qo'shish; **o'chirish va xizmat turlari CRUD yo'q** |

| Amal | Admin | Menejer |
|------|-------|---------|
| Mijoz/kontrakt/to'lov yaratish | ✅ | ✅ |
| To'lov / kirim / chiqim tahrirlash | ✅ | ✅ |
| Arxivga o'tkazish (delete) | ✅ | ❌ |
| Xizmat turlari CRUD | ✅ | ❌ |
| Xodimlar boshqaruvi | ✅ | ❌ |
| Arxiv / Audit | ✅ | ❌ |

---

## Ko'p tillilik (i18n)

- `frontend/src/i18n/locales/uz.ts` — o'zbekcha (asosiy)
- `frontend/src/i18n/locales/ru.ts` — ruscha

Yangi matn qo'shish:
1. Ikkala faylga bir xil kalit
2. Komponentda: `const { t } = useI18n();` → `t("bo'lim.kalit")`

Til/mavzu `localStorage`da saqlanadi.

---

## Testlar va verify

### Tezkor verify (tavsiya)

```bash
# Repo ildizidan (Linux/macOS)
bash .cursor/skills/wtma-verify/scripts/verify.sh
```

```powershell
# Windows
powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/skills/wtma-verify/scripts/verify.ps1
```

Skript o'zgargan qismga qarab frontend build (`tsc + vite`) va/yoki backend pytest ishga tushiradi.

### Backend (pytest)

```bash
docker compose exec api python -m pytest -q
# yoki lokal:
cd backend && pip install -r requirements-dev.txt && pytest -q
```

~**102 test**: auth, clients, contracts, import, payments (tahrirlash + audit), debts, dashboard, expenses, incomes, finance (oborot), documents, soft-delete/audit, debt filters.

### Frontend build

```bash
cd frontend && npm run build
```

### E2E (Playwright)

```bash
cd frontend
npm run test:e2e       # headless
npm run test:e2e:ui    # interaktiv
```

`e2e/auth.spec.ts`, `flows.spec.ts`, `full-flow.spec.ts` — login, navigatsiya, to'liq biznes oqimi.

---

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` — har push/PR da:
1. Backend pytest (Python 3.12)
2. Frontend build (`tsc -b && vite build`)
3. E2E Playwright (Docker stack bilan)

---

## Production'ga chiqarish

Serverda loyiha `/var/www/finance` papkasida joylashadi:

```bash
git clone https://github.com/SunnatDevPy/Finance_kpi.git /var/www/finance
cd /var/www/finance
cp .env.prod.example .env.prod
# JWT_SECRET, POSTGRES_PASSWORD, ADMIN_PASSWORD — kuchli qiymatlar!

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

| Farq | Dev | Prod |
|------|-----|------|
| Backend | `uvicorn --reload` | `--workers 2` |
| Frontend | Vite dev | nginx statik |
| HTTPS | yo'q | Caddy (Let's Encrypt) |
| Uploads | lokal volume | `uploads_data` volume |

**HTTPS sozlash:**
1. DNS A yozuvi server IP ga (`wtma.okaposai.uz` va `landing.okaposai.uz`)
2. `.env.prod`: `DOMAIN=wtma.okaposai.uz`, `LANDING_DOMAIN=landing.okaposai.uz`, `ACME_EMAIL=...`
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
4. Landing loyihasini `/var/www/landing_wtma` ga yuklab, `docker compose -f docker-compose.prod.yml up -d --build`

`DOMAIN=localhost` — faqat lokal sinov (self-signed).

---

## Agent / skill workflow

Loyiha Cursor agent skilllari bilan ishlaydi:

| Skill | Vazifa |
|-------|--------|
| `wtma-verify` | Kod o'zgargach build + pytest |
| `wtma-frontend` | Sahifa/komponent konvensiyalari |
| `wtma-backend` | FastAPI overlay |
| `wtma-docker` | Docker portlar va workflow |
| `wtma-i18n` | O'zbek/Rus tarjimalar |

Batafsil: [`AGENTS.md`](./AGENTS.md) · Ish tarixi: [`PLAN.md`](./PLAN.md)

---

## Keyingi qadamlar — nima yetishmayapti

Loyiha **ishchi production** darajasida. Quyidagilar keyingi rivojlantirish uchun mantiqiy navbat:

### Yuqori ustuvorlik

| # | Vazifa | Tavsif |
|---|--------|--------|
| 1 | **Email / Telegram bildirishnomalar** | Hozir faqat panel ichidagi bell + toast; tashqi kanal yo'q |
| 2 | **Qarzdorlik eslatmalari** | Muddati o'tgan qarzlar ro'yxati bor, avtomatik eslatma yuborilmaydi |
| 3 | **Hisobotlar va rejalashtirilgan eksport** | Oylik PDF/Excel avtomatik yuborish |
| 4 | **E2E testlarni kengaytirish** | Moliya oborot, to'lov tahriri, audit tiklash senariylari |

### O'rta ustuvorlik

| # | Vazifa | Tavsif |
|---|--------|--------|
| 5 | **Kengaytirilgan RBAC** | Masalan: faqat o'z mijozlari, faqat ko'rish rejimi |
| 6 | **Bulk to'lov kiritish** | Bir nechta shartnoma uchun bir vaqtda |
| 7 | **Kontrakt PDF shablon sozlash** | Kompaniya profili bor, shablon dizayni cheklangan |
| 8 | **Audit orqali versiya qaytarish** | Hozir faqat arxivdan tiklash; maydon qiymatini eski holatga qaytarish yo'q |

### Texnik qarorlar (uzoq muddat)

| # | Vazifa | Tavsif |
|---|--------|--------|
| 9 | **Monitoring / logging** | Sentry, Prometheus, markazlashtirilgan loglar |
| 10 | **DB backup avtomatizatsiyasi** | `pg_dump` cron + restore hujjati |
| 11 | **2FA (TOTP)** | Admin hisoblar uchun |
| 12 | **WebSocket** | Bildirishnomalar uchun polling o'rniga real-time |
| 13 | **Multi-filial / multi-kompaniya** | Hozir bitta kompaniya profili |
| 14 | **Performance profil** | 10k+ mijoz/shartnoma hajmida SQL optimizatsiya |

### Hozir **bor** deb hisoblash mumkin

- To'liq mijoz → shartnoma → to'lov → qarz hisoblash zanjiri
- Moliya oborot: yillik diagramma, yil/chorak filtrlari, xarajatlar taqsimoti
- To'lov tahrirlash va audit jurnalida o'zgarishlar diff
- O'zgarishlar tarixidan arxiv tiklash
- Soft-delete, arxiv, audit
- Excel import (3 oqim), Excel/PDF eksport
- Dashboard analitikasi (barcha xizmat turlari)
- i18n, dark mode, mobil layout, PWA
- Docker dev + prod + HTTPS
- CI pipeline
- RBAC (admin/menejer)

---

## Nosozliklarni bartaraf etish (Troubleshooting)

| Muammo | Yechim |
|--------|--------|
| `docker compose` ishlamaydi | Docker Desktop ochilganini tekshiring |
| API 500, jadval yo'q | `docker compose exec api alembic upgrade head` |
| Port band (5173/8002/5433) | `docker-compose.yml` portlarini o'zgartiring |
| Frontend o'zgarish ko'rinmaydi | `docker compose restart web` |
| Excel import ustun topilmadi | 1-qator sarlavhasida Kompaniya, Xizmat, Summa bo'lishi kerak |
| Toast chiqmayapti | Faqat POST/PATCH/DELETE muvaffaqiyatli bo'lganda; login/export da chiqmaydi |
| `bcrypt __about__` ogohlantirishi | Zararsiz, ishlashga ta'sir qilmaydi |
| Verify pytest skip | Dev image'da pytest yo'q — `verify.ps1` Docker orqali alohida ishga tushiradi |

---

## Qo'shimcha hujjatlar

| Fayl | Ma'nosi |
|------|---------|
| [`PLAN.md`](./PLAN.md) | To'liq ish tarixi (41+ bo'lim, xronologik) |
| [`CONTEXT.md`](./CONTEXT.md) | Domain lug'ati (agentlar uchun) |
| [`AGENTS.md`](./AGENTS.md) | Cursor skill konfiguratsiyasi |
| [`docs/adr/`](./docs/adr/) | Arxitektura qarorlari |
| [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) | Issue tracking workflow |

---

*Savol bo'lsa — avval shu README, keyin `PLAN.md` va Swagger (`/docs`). Kod o'zgartirgandan keyin `verify.ps1` ishga tushiring.*
