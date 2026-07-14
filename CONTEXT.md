# WTMA Finance — Domain Context

> Ubiquitous language for agents. Yangilash: `/grill-with-docs` yoki `domain-modeling` skill.

## Core entities

| Term | Meaning |
|------|---------|
| **Client** | Mijoz (kompaniya). Status: `faol`, `nofaol`. Qarz `total_debt` orqali hisoblanadi. |
| **Contract** | Xizmat shartnomasi. Workflow: `yangi`, `davom_etmoqda`, `tugadi`, `toxtatildi`. |
| **Payment** | Shartnoma bo'yicha to'lov (mijozdan tushum). Manfiy = refund. |
| **Income** | Shartnomaga bog'liq bo'lmagan boshqa kirim. |
| **Expense** | Biznes xarajati (ijara, ish haqi, marketing, …). |
| **Finance ledger** | Payment + Income + Expense birlashgan ko'rinish. |
| **Debt** | `total_amount − paid_amount`. Mijozlar/Kontraktlar filtrlari orqali ko'riladi. |
| **Employee** | Tizim foydalanuvchisi. Rol: `admin`, `menejer`. |

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Backend:** FastAPI + SQLAlchemy + Alembic + PostgreSQL
- **i18n:** `uz.ts` / `ru.ts` — har yangi matn uchun `t()` majburiy

## Ports (dev)

| Service | Port |
|---------|------|
| Web | 3000 |
| API | 8002 |
| DB | 5433 |

## UI conventions

- `PageShell` + `PageHeader` — sahifa layout
- `PremiumDataTable` + `MotionTableRow` — jadvallar
- `StatCard` — dashboard statistikasi
- B2B fintech uslubi — minimalist, premium glass
