# Framer Motion Patterns — WTMA Finance Panel

Copy-paste-ready snippets matching this project's actual components. All examples respect the motion principles in `SKILL.md`.

## Shared reduced-motion hook

Create once, reuse everywhere JS-driven duration/distance needs adjusting:

```tsx
// frontend/src/hooks/useMotionPreset.ts
import { useReducedMotion } from "framer-motion";

export function useMotionPreset() {
  const reduce = useReducedMotion();
  return {
    duration: reduce ? 0 : 0.35,
    distance: reduce ? 0 : 8,
    ease: [0.16, 1, 0.3, 1] as const,
  };
}
```

CSS-based animations (Tailwind `animate-*`, dialog `data-open`) are already covered by the global `prefers-reduced-motion` block in `index.css` — this hook is only for values passed into `motion.*` props.

## Page transitions

Wrap the routed content in `Layout.tsx` so every page fades+slides in on navigation.

```tsx
// frontend/src/components/Layout.tsx
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Outlet } from "react-router-dom";

// inside the component, replace the <Outlet /> line:
const location = useLocation();

<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Keep `mode="wait"` so the old page fully exits before the new one enters — avoids overlapping scroll/layout jumps on data-heavy pages.

## List stagger

For `StatCard` grids (Dashboard, ServiceTypes) and `PremiumDataTable` rows (Clients, Contracts, Payments):

```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

<motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" initial="hidden" animate="visible" variants={container}>
  {cards.map((card) => (
    <motion.div key={card.id} variants={item}>
      <StatCard {...card} />
    </motion.div>
  ))}
</motion.div>
```

For table rows, wrap `TableBody`'s `.map()` output: use `motion.tr` is not directly compatible with the shadcn `TableRow` (which renders a real `<tr>`); instead pass `asChild`-style via a plain `<tr>` wrapped in `motion.create(TableRow)`:

```tsx
import { motion } from "framer-motion";
import { TableRow } from "../components/PremiumDataTable";

const MotionRow = motion.create(TableRow);

<TableBody>
  {clients.map((client, i) => (
    <MotionRow
      key={client.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.02, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* cells */}
    </MotionRow>
  ))}
</TableBody>
```

Cap `Math.min(i, 12)` so 50+ row tables don't produce a multi-second cascade.

## Modal transitions

`Modal.tsx` / `AlertDialog` are built on **Base UI**, which already animates mount/unmount via `data-open`/`data-closed` + `tw-animate-css` (see `frontend/src/components/ui/dialog.tsx`). **Do not** wrap them in `AnimatePresence` — Base UI keeps the node mounted during the closing transition, which conflicts with Framer's exit-then-unmount model.

Instead, animate the **internal content** (e.g., dynamic line items in the Contracts form) with `layout` + `AnimatePresence` scoped to that list only:

```tsx
// frontend/src/pages/Contracts.tsx — line items list
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence initial={false}>
  {form.line_items.map((item, index) => (
    <motion.div
      key={index}
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-2 overflow-hidden"
    >
      {/* Select + FloatingLabelInput + remove button */}
    </motion.div>
  ))}
</AnimatePresence>
```

## Number count-up

For `StatCard` money/percent values (Dashboard) — animate the numeric value on mount/update without bouncing:

```tsx
// frontend/src/components/AnimatedNumber.tsx
import { useEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{format(0)}</span>;
}
```

Use in `StatCard.tsx` by replacing the static `{value}` text with `<AnimatedNumber value={numericValue} format={formatMoney} />` — pass the raw number, format inside.

## Micro-interactions

Buttons, `Card` hover in `ServiceTypes.tsx`, table row hover:

```tsx
<motion.div
  whileHover={{ y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
>
  <Card>...</Card>
</motion.div>
```

Keep `y` translation ≤ 2px and `scale` ≥ 0.97 — larger values read as "playful", which violates the B2B fintech style.

## Dropdown panels

`NotificationBell.tsx` and `GlobalSearch.tsx` results panel — replace the plain `{open && (...)}` block:

```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-0 top-full z-50 mt-2 w-80 ..."
    >
      {/* panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

## Progress bars

Dashboard "Balance" widget and top-clients paid-ratio bars — animate `width` via the `style` prop (Framer batches this efficiently when driven by a single `motion.div`, unlike raw CSS transition on every re-render):

```tsx
<div className="h-3.5 w-full overflow-hidden rounded-full bg-muted">
  <motion.div
    className="h-full bg-emerald-500"
    initial={{ width: 0 }}
    animate={{ width: `${paidPercent}%` }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  />
</div>
```

For the client-status donut (`recharts` `Pie`), Recharts handles its own enter animation (`isAnimationActive` prop, default `true`) — no Framer Motion needed there.
