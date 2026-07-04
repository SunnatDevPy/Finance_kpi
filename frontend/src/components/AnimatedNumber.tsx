import { useEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/** Smooth count-up for stat card figures (no bounce — fintech-appropriate). */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const reduce = useReducedMotion();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    const from = hasMountedRef.current ? motionValue.get() : 0;
    hasMountedRef.current = true;
    motionValue.set(from);
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
