---
name: wtma-backend
description: >-
  WTMA Finance Panel backend overlay. For general FastAPI patterns use
  fullstack-backend skill first. This skill adds finance-project-specific paths,
  endpoints, and conventions under d:\Finance_managment\backend\.
---

# WTMA Backend (project overlay)

> **Universal base:** use `fullstack-backend` skill for general FastAPI/SQLAlchemy patterns.

## Project paths

- Backend root: `backend/app/`
- Router registry: `backend/app/api/router.py`
- Pagination: `app/schemas/pagination.py` → `Page[T]`
- Auth deps: `app/api/deps.py` (`get_current_user`, `require_admin`)
- Helpers: `app/services/helpers.py`

## API routes (`/api/v1`)

See `wtma-backend/reference.md` in this folder for full route table.

## Project-specific rules

- Error messages in **Uzbek** (match existing strings).
- Money: `Decimal` → JSON `str`; frontend uses `formatMoney`.
- Docker: API on host port **8002**, DB on **5433**.

For export, dashboard, notifications — see [reference.md](reference.md).
