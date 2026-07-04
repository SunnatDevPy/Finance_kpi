# WTMA Finance — Domain Context

> Ubiquitous language for agents. Yangilash: `/grill-with-docs` yoki `domain-modeling` skill.

## Core entities

| Term | Meaning |
|------|---------|
| **Client** | Mijoz (kompaniya). Status: `faol`, `nofaol`, `qarzdor`. |
| **Contract** | Xizmat shartnomasi. Bir mijozda bir nechta bo‘lishi mumkin. |
| **Payment** | To‘lov. Shartnoma yoki qarzga bog‘langan. |
| **Service type** | Xizmat turi (masalan, marketing, logistika). |
| **Debt** | Mijoz qarzi — shartnoma summasi minus to‘lovlar. |
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
