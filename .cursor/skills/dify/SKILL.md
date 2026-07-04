---
name: dify
description: >-
  Deploy, configure, and integrate Dify (langgenius/dify) — open-source LLM app
  platform for workflows, RAG, agents, and chat apps. Use when the user mentions
  Dify, AI workflow, RAG pipeline, LLM integration, chatbot for finance panel,
  self-host Dify, Dify API, or connecting FastAPI/React apps to Dify.
---

# Dify Platform

[Dify](https://github.com/langgenius/dify) — production-ready platform for agentic workflow development: visual workflows, RAG, agents, prompt IDE, model management, observability, and REST APIs.

**Docs:** https://docs.dify.ai · **Cloud:** https://cloud.dify.ai · **Repo:** https://github.com/langgenius/dify

## When to use

| Goal | Approach |
|------|----------|
| Self-host Dify locally | Docker Compose (see below) |
| Add AI chat to Finance Panel | Dify Chat App + API from FastAPI/React |
| Contract/document Q&A | Dify Knowledge Base (RAG) |
| Multi-step finance automation | Dify Workflow |
| Tool-using agent (search, APIs) | Dify Agent + custom tools |

## Quick start (Docker)

**Requirements:** CPU ≥ 2 cores, RAM ≥ 4 GiB, Docker + Docker Compose.

```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
docker compose up -d
```

Open **http://localhost/install** and complete setup.

> Dify uses its own Postgres/Redis/Weaviate stack — run on **separate ports** from this project's `docker-compose.yml` (finance: 3000/8002/5433).

### Custom config

Edit `docker/.env`; optional vars in `docker/envs/`. Restart: `docker compose up -d` from `docker/`.

## Core concepts

| Concept | Description |
|---------|-------------|
| **App types** | Chatbot, Text Generator, Agent, Workflow |
| **Knowledge** | RAG datasets — PDF, DOCX, TXT ingestion |
| **Workflow** | Visual DAG: LLM, code, HTTP, condition nodes |
| **Model provider** | OpenAI, Anthropic, local Ollama, etc. |
| **API keys** | Per-app `API Key` for server-to-server calls |

## API integration (Finance Panel)

Base URL (self-hosted): `http://localhost/v1` (via nginx) or your Dify Cloud URL.

### Chat app (blocking)

```python
import httpx

def ask_dify(query: str, user_id: str, api_key: str) -> str:
    r = httpx.post(
        "http://localhost/v1/chat-messages",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "user": user_id,
        },
        timeout=120.0,
    )
    r.raise_for_status()
    return r.json()["answer"]
```

### Workflow run

```python
r = httpx.post(
    "http://localhost/v1/workflows/run",
    headers={"Authorization": f"Bearer {api_key}"},
    json={"inputs": {"contract_id": "123"}, "response_mode": "blocking", "user": user_id},
)
```

### FastAPI pattern (this project)

1. Add env vars to `backend`: `DIFY_API_URL`, `DIFY_API_KEY`
2. Create `backend/app/services/dify.py` — thin HTTP client
3. Expose optional route e.g. `POST /api/ai/ask` (admin-only)
4. Frontend: chat widget or page calling backend proxy (never expose API key in browser)

### Node/React (frontend proxy via backend)

Prefer backend proxy. If using Dify embed: use **Web App** publish URL + `window.difyChatbotConfig` (see Dify docs).

## Finance Panel use cases

1. **Contract assistant** — upload contract templates to Knowledge; chat app answers payment terms questions
2. **Debt summary** — workflow node calls Finance API (`GET /api/clients`) then LLM summarizes
3. **Notification drafts** — text generator for expiring-contract reminder messages (uz/ru)
4. **Export helper** — agent with HTTP tool to trigger export endpoints

## SDKs

Official clients in Dify repo `sdks/`:

- `sdks/nodejs-client` — Node.js
- `sdks/php-client` — PHP

Python: use `httpx` or `requests` against REST API (no official Python SDK in repo).

## MCP & tools

Dify supports MCP servers as agent tools (v1.0+). Configure in Dify Studio → Agent → Tools → MCP.

## Official contributor skills (bundled)

Copied from `langgenius/dify/.agents/skills` into this project:

| Skill | Use when |
|-------|----------|
| `dify-backend-code-review` | Reviewing Dify `api/` Python code |
| `dify-frontend-code-review` | Reviewing Dify `web/` React/Next code |
| `dify-frontend-testing` | Vitest/RTL tests for Dify frontend |
| `dify-e2e-cucumber-playwright` | E2E tests for Dify |
| `dify-how-to-write-component` | New Dify UI components |
| `dify-karpathy-guidelines` | General coding guidelines |

> These target **Dify source development**, not Finance Panel — use `dify` (this skill) for integrating Dify with WTMA.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/install` not loading | Wait for all containers healthy; check `docker compose ps` |
| API 401 | Regenerate app API key in Dify Studio |
| Slow RAG | Reduce chunk size; check embedding model |
| Port conflict with finance stack | Change `EXPOSE_NGINX_PORT` in Dify `docker/.env` |

## Additional resources

- API reference: [reference.md](reference.md)
- Dify FAQ: https://docs.dify.ai/getting-started/install-self-hosted/faqs
