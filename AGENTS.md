## Agent skills

This repo uses Cursor / agent skills. Configuration:

- **Skill catalog:** `C:\Users\Asus\skill.md` (global, outside repo)
- **Issue tracker:** local markdown — see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)
- **Domain context:** [CONTEXT.md](CONTEXT.md)
- **ADRs:** [docs/adr/](docs/adr/)

Matt Pocock engineering skills (`tdd`, `grill-with-docs`, `code-review`, …) are installed under `.agents/skills/`.

### Loyiha skilllari (`.cursor/skills/`)

| Skill | Vazifasi |
|-------|----------|
| **wtma-verify** | Kod o'zgargach `verify.ps1` / `verify.sh` — build + pytest + xatolarni tekshirish |
| **wtma-frontend** | Sahifa/komponent konvensiyalari |
| **wtma-backend** | FastAPI overlay |
| **wtma-docker** | Docker Compose workflow |
