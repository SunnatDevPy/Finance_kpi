---
name: wtma-docker
description: >-
  WTMA Finance Panel Docker overlay. For general Docker dev patterns use
  docker-dev skill first. Ports and env specific to this project's
  docker-compose.yml.
---

# WTMA Docker (project overlay)

> **Universal base:** `docker-dev` skill.

## Services & ports

| Service | Host port | Container |
|---------|-----------|-----------|
| `db` | **5433** | 5432 |
| `api` | **8002** | 8000 |
| `web` | **3000** | 3000 |

## URLs

- Frontend: http://localhost:3000
- API docs: http://localhost:8002/docs
- DB: `postgresql://finance:finance@localhost:5433/finance_db`

## Startup

API runs `alembic upgrade head` → `python -m app.seed` → `uvicorn --reload` on container start.

## Default admin

`ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin123` (dev only).
