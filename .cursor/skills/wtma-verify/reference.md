# WTMA Verify — reference

## Skript flaglari

```powershell
# Faqat frontend
powershell -File .cursor/skills/wtma-verify/scripts/verify.ps1 -FrontendOnly

# Faqat backend
powershell -File .cursor/skills/wtma-verify/scripts/verify.ps1 -BackendOnly

# Ikkalasini majburiy
powershell -File .cursor/skills/wtma-verify/scripts/verify.ps1 -All
```

## CI bilan moslik

GitHub Actions (`.github/workflows/ci.yml`):

- Backend: `pytest -q` (`backend/`)
- Frontend: `npm ci && npm run build` (`frontend/`)

Lokal verify CI ning tez varianti — E2E kiritilmagan (sekin).

## Tipik xatolar

| Xato | Sabab | Yechim |
|------|-------|--------|
| `auth_router is not defined` | Import o'chib ketgan | `router.py` importlarni tekshirish |
| TS1117 duplicate property | i18n da takroriy kalit | `uz.ts` / `ru.ts` |
| `backdrop-blur-xs` | Tailwind 3.4 da yo'q | `backdrop-blur-sm` |
| Alembic | migratsiya qo'llanmagan | `docker compose exec api alembic upgrade head` |
