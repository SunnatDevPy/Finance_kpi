---
name: wtma-i18n
description: >-
  WTMA Finance Panel i18n overlay (Uzbek + Russian). For general i18n patterns
  use i18n-multilingual skill first. Locales: uz.ts (default) and ru.ts.
---

# WTMA i18n (project overlay)

> **Universal base:** `i18n-multilingual` skill.

## Files

- `frontend/src/i18n/locales/uz.ts`
- `frontend/src/i18n/locales/ru.ts`
- `frontend/src/context/I18nContext.tsx`
- `frontend/src/utils/format.ts` — `formatMoney`, `formatDate` (locale-aware)

## Locales

| Code | Language | Money suffix |
|------|----------|--------------|
| `uz` | O'zbek (default) | ` so'm` |
| `ru` | Русский | ` сум` |

## Key groups

`common.*`, `nav.*`, `auth.*`, `dashboard.*`, `clients.*`, `contracts.*`, `payments.*`, `services.*`, `employees.*`, `profile.*`, `export.*`, `notifications.*`, `pagination.*`, `settings.*`, `roles.*`, `status.*`, `search.*`

Always add keys to **both** `uz.ts` and `ru.ts`.
