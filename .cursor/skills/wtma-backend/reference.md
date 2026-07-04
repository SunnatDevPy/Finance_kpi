# WTMA Backend — Reference

## Existing API routes (`/api/v1`)

| Prefix | File | Notes |
|--------|------|-------|
| `/health` | `health.py` | Health check |
| `/auth` | `auth.py` | Login, change password |
| `/dashboard` | `dashboard.py` | Stats, charts, top clients |
| `/notifications` | `notifications.py` | Expiring contracts |
| `/export` | `export.py` | Excel/PDF download |
| `/settings` | `settings.py` | Monthly plan, notify days |
| `/clients` | `clients.py` | CRUD + card view |
| `/service-types` | `service_types.py` | Catalog |
| `/contracts` | `contracts.py` | CRUD + line items |
| `/payments` | `payments.py` | List + delete |
| `/users` | `users.py` | Admin: employees |

## Export (`app/services/export_files.py`)

- Query params: `date_from`, `date_to` for filtered exports.
- Resources: `debts`, `payments`, `contracts`.
- Returns file stream — frontend uses `ExportButtons` component.

## Dashboard service

`app/services/dashboard.py` aggregates:
- Monthly revenue vs plan, revenue growth %, collection rate.
- Charts: revenue trend, revenue vs plan, revenue by service.
- Top clients, expiring contracts.

## Seed data

`python -m app.seed` — creates default admin user (env: `ADMIN_USERNAME`, `ADMIN_PASSWORD`).

## Docker dev

API runs on host port **8002** → container 8000. DB on **5433** → 5432.
Auto-migrates and seeds on container start (`docker-compose.yml`).
