---
name: framer-motion
description: >-
  Add smooth, premium micro-interactions and page/list/modal animations to the
  WTMA Finance Panel using Framer Motion. Use when the user asks to animate a
  component, add page transitions, animate a table/list, add hover/tap
  feedback, animate stat card numbers, or make the UI feel "kuchli"/"jonli"/
  "zamonaviy". Enforces this project's serious B2B fintech motion style (no
  bouncy/playful easing) per .cursorrules.
---

# Framer Motion — WTMA Finance Panel

This project mandates Framer Motion for all animation (`.cursorrules` rule #1) and forbids playful/cartoon motion — the panel is a **serious, minimalist B2B fintech tool** (rule #2). `framer-motion` is installed in `frontend/package.json`.

## Motion principles (non-negotiable)

1. **Subtle, not bouncy.** Use `ease: [0.16, 1, 0.3, 1]` (expo-out) or spring with `stiffness: 300, damping: 30`. Never overshoot/wobble on business data.
2. **Animate only `transform` and `opacity`** — GPU-accelerated, no layout thrashing. Never animate `width`/`height`/`top`/`left` directly (use `layout` prop instead).
3. **Duration 150–350ms** for UI feedback, up to 500ms for page-level entrances. Anything slower feels laggy on a data-heavy dashboard.
4. **Always respect `prefers-reduced-motion`** — wrap durations with the `useReducedMotion` hook (see patterns.md).
5. **Money/numbers are serious** — no spring bounce on currency figures, only smooth count-up or fade.
6. **Stagger lists sparingly**: `staggerChildren: 0.03–0.05s`, cap total stagger under ~400ms for tables with many rows (skip stagger entirely past ~15 visible rows — animate the container only).

## Where to apply motion in this project

| Location | Effect | Reference |
|----------|--------|-----------|
| Route change (`Layout.tsx` → `<Outlet />`) | Fade + 8px slide-up page transition | [patterns.md#page-transitions](patterns.md#page-transitions) |
| `PremiumDataTable` rows, `StatCard` grids, Clients/Contracts/Payments lists | Staggered fade-in on data load | [patterns.md#list-stagger](patterns.md#list-stagger) |
| `Modal.tsx`, `AlertDialog` (delete confirm) | Scale+fade enter/exit via `AnimatePresence` | [patterns.md#modal-transitions](patterns.md#modal-transitions) |
| `StatCard` values (Dashboard) | Count-up animation for money/percent | [patterns.md#number-count-up](patterns.md#number-count-up) |
| Buttons, table row hover, `Card` hover | `whileHover`/`whileTap` micro-feedback | [patterns.md#micro-interactions](patterns.md#micro-interactions) |
| `NotificationBell` dropdown, `GlobalSearch` results | Height/opacity pop-in | [patterns.md#dropdown-panels](patterns.md#dropdown-panels) |
| Dashboard donut chart center label, balance bars | Animate width/value on mount | [patterns.md#progress-bars](patterns.md#progress-bars) |

## Quick start

```tsx
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

<motion.div initial="hidden" animate="visible" variants={fadeUp}>
  {children}
</motion.div>
```

For container + staggered children, `AnimatePresence` exit animations, count-up numbers, and dropdown panels, **read [patterns.md](patterns.md)** — it has copy-paste-ready code matching this project's existing components (`StatCard`, `Modal`, `PremiumDataTable`, `Layout`).

## Workflow

1. Identify the target component and which table above it maps to.
2. Copy the matching pattern from `patterns.md`.
3. Adapt class names / data to the actual component — do not introduce new color/spacing tokens, reuse existing Tailwind + `brand-*` classes.
4. Verify `prefers-reduced-motion` is respected (project already sets this globally in `index.css`; Framer Motion needs the `useReducedMotion` hook additionally for JS-driven animations).
5. Run `npm run build` in `frontend/` to confirm no TypeScript errors.

## Anti-patterns (do NOT do)

- ❌ Bouncy spring (`type: "spring"` with low damping) on cards, numbers, or tables — feels unprofessional for a finance tool.
- ❌ Animating on every re-render (missing `key` on `AnimatePresence` children causes re-mounts / jank).
- ❌ Rotating/scaling icons for decoration without user interaction (distracting in a data-dense UI).
- ❌ Long entrance animations (>500ms) that delay perceived load time on data tables.
- ❌ Animating `box-shadow` directly for hover glow — prefer opacity-layered pseudo elements or pre-existing `.stat-card-glow-*` CSS classes.
