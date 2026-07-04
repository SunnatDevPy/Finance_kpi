---
name: wtma-frontend
description: >-
  WTMA Finance Panel frontend overlay. For general React patterns use
  react-frontend and framer-motion skills first. This skill adds finance-project
  components and page conventions under frontend/src/.
---

# WTMA Frontend (project overlay)

> **Universal base:** `react-frontend` + `framer-motion` + `ui-styling` + `apple-hig-expert`.

## Project components (use these)

| Component | Path |
|-----------|------|
| `PageShell`, `PageHeader` | `components/PageHeader.tsx` |
| `PremiumDataTable`, `MotionTableRow`, `rowEnter` | `components/PremiumDataTable.tsx` |
| `StatCard`, `AnimatedNumber` | `components/StatCard.tsx`, `AnimatedNumber.tsx` |
| `StaggerContainer`, `StaggerItem` | `components/Stagger.tsx` |
| `Modal`, `FloatingLabelInput` | `components/Modal.tsx`, `ui/floating-label-input.tsx` |
| `CompanyAvatar`, `TableCellCompany` | `components/CompanyAvatar.tsx`, `PremiumDataTable.tsx` |

## Stack

React 19 + Vite + TS + Tailwind + shadcn/ui (Base UI) + Framer Motion + Recharts.

## Rules (`.cursorrules`)

- B2B fintech — minimalist, no playful colors.
- All strings via `t()` — see `wtma-i18n` / `i18n-multilingual`.
- Lazy routes in `App.tsx`; mobile drawer sidebar in `Layout.tsx`.

## API

`frontend/src/api/client.ts` — base `/api/v1`, types in `types/index.ts`.
