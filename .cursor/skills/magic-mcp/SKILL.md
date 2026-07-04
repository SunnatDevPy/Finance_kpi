---
name: magic-mcp
description: >-
  Use 21st.dev Magic MCP to generate and refine React/shadcn UI components from
  natural language (like v0 inside Cursor). Activate when the user asks for /ui,
  Magic MCP, 21st components, or wants AI-generated premium UI blocks for this
  finance panel (tables, dashboards, forms, cards).
---

# Magic MCP (21st.dev)

Magic MCP connects Cursor to [21st.dev Magic](https://21st.dev/magic) — generate polished UI components from chat.

## Prerequisites (shaxsiy — faqat lokal)

**API kalit** (21st.dev MCP):

```
21st_sk_870e6dc67baeddfa09b09e2e4aab53d9622abe5fd1789c08cd7777e05c472bf1
```

- MCP: `.cursor/mcp.json` ichida `x-api-key` header sifatida o'rnatilgan.
- CLI: `API_KEY_21ST` yoki `TWENTYFIRST_TOKEN` muhit o'zgaruvchisi.
- Kalit olish: https://21st.dev/mcp
- **Cursor'ni qayta ishga tushiring** MCP ishlashi uchun.

> `.cursor/mcp.json` `.gitignore`da — repoga commit qilinmaydi.

## When to use

- User types `/ui ...` or asks for a new component from description
- Need a premium table, stat card, dashboard section, or form layout fast
- Want components inspired by [21st.dev](https://21st.dev) library

## How to use in chat

```
/ui create a premium finance data table with zebra rows and money columns
/ui build a modern dashboard stat card with gradient and icon
/ui design a login split panel for fintech app
```

The MCP server generates React + TypeScript components. Integrate into:
- `frontend/src/components/` — reusable UI
- `frontend/src/pages/` — page-specific sections

## Stack for this project

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Lucide icons
- Match existing `brand` colors and `PremiumDataTable` patterns

## Companion tools

| Tool | Purpose |
|------|---------|
| `21st-cli` skill | Search/install/publish via terminal (`21st search`, `21st add`) |
| `ui-ux-pro-max` skill | Design system, colors, typography, UX rules |
| `ui-styling` skill | Tailwind + shadcn theming |

## CLI alternatives (no MCP)

```bash
npx @21st-dev/cli login
21st search "data table"
21st add shadcn/button
21st generate "premium finance dashboard card"
```

## Troubleshooting

- MCP not listed → restart Cursor, verify `API_KEY_21ST` is set
- Auth errors → regenerate key at https://21st.dev/mcp
- Repo docs: https://github.com/21st-dev/magic-mcp
