# Dify API Reference (integration)

## Authentication

```
Authorization: Bearer {API_KEY}
```

API keys are per-app: Dify Studio → App → API Access → Create API Key.

## Base URLs

| Deployment | Base URL |
|------------|----------|
| Self-hosted (nginx) | `http://localhost/v1` |
| Dify Cloud | `https://api.dify.ai/v1` |

## Common endpoints

### Chat messages

`POST /chat-messages`

```json
{
  "inputs": {},
  "query": "User message",
  "response_mode": "blocking",
  "conversation_id": "",
  "user": "user-unique-id"
}
```

Streaming: `"response_mode": "streaming"` — SSE response.

### Workflow

`POST /workflows/run`

```json
{
  "inputs": { "key": "value" },
  "response_mode": "blocking",
  "user": "user-unique-id"
}
```

### Completion (text generator)

`POST /completion-messages`

Same shape as chat; no conversation history.

### File upload (for vision / knowledge)

`POST /files/upload` — multipart form; use returned `upload_file_id` in inputs.

### Conversation history

- `GET /messages?user={user}&conversation_id={id}`
- `DELETE /conversations/{conversation_id}`

Full spec: https://docs.dify.ai/guides/application-publishing/developing-with-apis

## Environment variables (Finance Panel backend)

```env
DIFY_API_URL=http://host.docker.internal/v1
DIFY_API_KEY=app-xxxxxxxx
DIFY_DEFAULT_USER=finance-panel
```

Use `host.docker.internal` when Dify runs on host and Finance API in Docker.

## Docker port map (default Dify)

| Service | Internal | Exposed |
|---------|----------|---------|
| Nginx (UI + API gateway) | 80 | 80 |
| API | 5001 | — |
| Postgres | 5432 | — |
| Weaviate | 8080 | — |

Finance Panel ports (avoid conflict): web 3000, api 8002, db 5433.

## Links

- Self-host: https://docs.dify.ai/getting-started/install-self-hosted/docker
- Model providers: https://docs.dify.ai/guides/model-configuration
- Knowledge/RAG: https://docs.dify.ai/guides/knowledge-base
- Workflow nodes: https://docs.dify.ai/guides/workflow
