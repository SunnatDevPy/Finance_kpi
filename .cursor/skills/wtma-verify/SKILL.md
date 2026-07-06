---
name: wtma-verify
description: >-
  Runs build and error checks after code changes in WTMA Finance Panel. Use after
  editing frontend or backend code, before finishing a task, when the user asks
  to verify/build/test, or when fixing TypeScript/Python errors.
---

# WTMA Verify (build + xatolarni tekshirish)

Kod o'zgartirilgandan keyin agent **majburiy** ravishda tekshiruv o'tkazadi. Vazifa tugallangan deb hisoblanmaydi, agar verify muvaffaqiyatsiz bo'lsa.

## Qachon ishga tushirish

Har quyidagi holatdan keyin:

- `frontend/` yoki `backend/` fayllariga yozish/o'zgartirish
- API, model, migratsiya, komponent, sahifa qo'shish
- Foydalanuvchi "build", "tekshir", "xato bormi" desa

## Tezkor buyruq

Repo ildizidan (Windows):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/skills/wtma-verify/scripts/verify.ps1
```

Linux/macOS / Git Bash:

```bash
bash .cursor/skills/wtma-verify/scripts/verify.sh
```

Skript o'zgargan yo'llarga qarab faqat kerakli qismni tekshiradi (`frontend/`, `backend/`). Hech narsa aniqlanmasa — ikkalasini ham tekshiradi.

## Agent workflow

```
1. Kod o'zgarishlari tugadi
2. verify.ps1 / verify.sh ishga tushiriladi
3. Xato bo'lsa → tuzatish → 2-qadam qayta
4. Muvaffaqiyat → ReadLints (o'zgartirilgan fayllar)
5. Foydalanuvchiga qisqa natija: nima tekshirildi, nima o'tdi
```

## Qo'lda tekshirish (skript ishlamasa)

| Qism | Buyruq | Joy |
|------|--------|-----|
| Frontend | `npm run build` | `frontend/` |
| Backend import | `python -m compileall app` | `backend/` |
| Backend test | `docker compose exec api python -m pytest -q` | repo ildizi |
| Linter | `ReadLints` | o'zgartirilgan fayllar |

PowerShell da `&&` ishlatilmaydi — `;` yoki alohida buyruqlar.

## Docker

Backend testlari uchun konteyner ishlayotgan bo'lsa, skript avtomatik `docker compose exec api python -m pytest -q` ni ham ishga tushiradi.

## Xatolarni tuzatish tartibi

1. **TypeScript / build** — `tsc` xabaridagi fayl va qator
2. **Import yo'q** — `router.py`, `client.ts`, `types/index.ts` eksportlari
3. **i18n** — `uz.ts` va `ru.ts` bir xil kalitlar
4. **Python** — sintaksis, keyin pytest
5. Tuzatgach verify ni **qayta** ishga tushirish

## Cheklovlar

- Foydalanuvchi so'ramaguncha `git commit` / `git push` qilmang
- `.env` va maxfiy fayllarni commit qilmang
- E2E (`test:e2e`) faqat katta o'zgarishlar yoki foydalanuvchi so'raganda

## Avtomatik hook (Cursor)

`.cursor/hooks.json` — agent har turn tugaganda `verify-on-stop.ps1` ishga tushadi:

- `frontend/` yoki `backend/` o'zgarganda verify qiladi
- Xato bo'lsa agentga avtomatik `followup_message` yuboriladi (max 5 marta)
- Verify kerak emas bo'lsa: `.cursor/skip-verify` fayl yarating

Hook ishlamasa: Cursor ni qayta ishga tushiring, **Hooks** output kanalini tekshiring.

## Qo'shimcha

Batafsil buyruqlar: [reference.md](reference.md)
