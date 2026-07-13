import { useMemo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface LoginAtmosphereProps {
  revealed: boolean;
  /** Mobil / past qatlam — og'ir animatsiyalarni o'chiradi */
  lite?: boolean;
}

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    duration: 14 + Math.random() * 12,
    delay: Math.random() * 14,
    drift: (Math.random() - 0.5) * 60,
  }));
}

/**
 * Login sahifasining fon atmosferasi — nebula mesh, aurora tasmalar,
 * ko'tarilib boruvchi zarrachalar, gorizont to'ri va nozik grain
 * (filmik) qatlami. Barchasi sof CSS/Tailwind + Framer Motion bilan
 * (uchinchi tomon kutubxonasiz), 60 FPS uchun faqat transform/opacity
 * animatsiya qilinadi.
 */
export function LoginAtmosphere({ revealed, lite = false }: LoginAtmosphereProps) {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(() => buildParticles(lite ? 0 : 18), [lite]);
  const animate = !reduceMotion && !lite;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="login-bg-mesh" />
      {!lite && <div className="login-bg-mesh login-bg-mesh--alt" />}
      {animate && <div className="login-aurora-glow" />}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_38%_48%,rgba(56,189,248,0.14),transparent_62%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_38%_48%,rgba(56,189,248,0.22),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_75%_75%,rgba(99,102,241,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_45%_40%_at_75%_75%,rgba(99,102,241,0.14),transparent_60%)]" />
      {!lite && <div className="login-intro-stars absolute inset-0" />}

      {animate && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {particles.map((p) => (
            <span
              key={p.id}
              className="login-particle"
              style={
                {
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `${p.delay}s`,
                  "--drift": `${p.drift}px`,
                } as CSSProperties
              }
            />
          ))}
        </motion.div>
      )}

      {!lite && <div className="login-horizon-grid" />}
      {!lite && <div className="dot-grid absolute inset-0 text-foreground/[0.06] dark:text-foreground/[0.12]" />}
      {!lite && <div className="login-grain" />}
    </div>
  );
}
