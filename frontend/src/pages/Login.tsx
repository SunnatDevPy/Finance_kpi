import { useState, useEffect, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogInIcon, Loader2Icon, LockIcon, UserIcon, AlertCircleIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { SettingsToolbar } from "../components/SettingsToolbar";
import { LoginGlobe } from "../components/login/LoginGlobe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EASE = [0.16, 1, 0.3, 1] as const;
const INTRO_MS = 2500;
const TRANSITION_S = 1.15;

/** Globusning aynan shu ulushi (30%) login karta ortida yashiringan turadi. */
const OVERLAP_RATIO = 0.3;
const CARD_WIDTH = 440;

type Phase = "intro" | "revealed";

interface StageLayout {
  /** Globus diametri (px) */
  diameter: number;
  /** Globus markazining X koordinatasi (px), "revealed" holatda */
  centerX: number;
  /** Login kartaning chap chekkasi (px) */
  cardLeft: number;
  /** Login karta kengligi (px) */
  cardWidth: number;
  /** Intro holatida globus markazi (ekran o'rtasi) */
  introCenterX: number;
  mobile: boolean;
}

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

function computeStageLayout(vw: number): StageLayout {
  if (vw < 640) {
    const diameter = clamp(240, vw * 0.82, 420);
    const cardWidth = Math.min(CARD_WIDTH, vw - 32);
    return {
      diameter,
      centerX: vw / 2,
      cardLeft: vw / 2 - cardWidth / 2,
      cardWidth,
      introCenterX: vw / 2,
      mobile: true,
    };
  }

  // Globus ekran kengligining ~50% ini egallaydi — kichik noutbukdan
  // 3K/4K monitorgacha mutanosib ravishda kattalashadi.
  const diameter = clamp(420, vw * 0.5, 1500);
  const cardWidth = CARD_WIDTH;
  // Globus + karta bir butun blok sifatida ekranda markazlashtiriladi,
  // shuning uchun juda keng monitorlarda bo'sh joy ikki chetga teng taqsimlanadi.
  const visibleGlobeWidth = diameter * (1 - OVERLAP_RATIO);
  const totalWidth = visibleGlobeWidth + cardWidth;
  const compositionLeft = Math.max(16, (vw - totalWidth) / 2);

  const centerX = compositionLeft + diameter / 2;
  const cardLeft = compositionLeft + visibleGlobeWidth;

  return { diameter, centerX, cardLeft, cardWidth, introCenterX: vw / 2, mobile: false };
}

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(() => (reduceMotion ? "revealed" : "intro"));
  const [layout, setLayout] = useState<StageLayout>(() =>
    computeStageLayout(typeof window !== "undefined" ? window.innerWidth : 1440),
  );

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLayout(computeStageLayout(window.innerWidth)));
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setPhase("revealed"), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const revealed = phase === "revealed";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="login-bg-mesh" />
        <div className="login-bg-mesh login-bg-mesh--alt" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_38%_48%,rgba(56,189,248,0.14),transparent_62%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_38%_48%,rgba(56,189,248,0.22),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_75%_75%,rgba(99,102,241,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_45%_40%_at_75%_75%,rgba(99,102,241,0.14),transparent_60%)]" />
        <div className="login-intro-stars absolute inset-0" />
        <div className="dot-grid absolute inset-0 text-foreground/[0.06] dark:text-foreground/[0.12]" />
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6"
      >
        <SettingsToolbar variant="login" />
      </motion.div>

      {/* 3D Globus — o'lchami (diameter) ekran kengligiga mutanosib hisoblanadi,
          markazi esa karta bilan aynan 30% qoplanish hosil qiladigan nuqtaga
          transform orqali (layout reflow'siz) suriladi. */}
      <motion.div
        className="absolute z-20 top-1/2"
        style={{ left: 0, width: layout.diameter, height: layout.diameter }}
        initial={false}
        animate={
          revealed
            ? { x: layout.centerX - layout.diameter / 2, y: "-50%", scale: 1 }
            : { x: layout.introCenterX - layout.diameter / 2, y: "-50%", scale: 1.12 }
        }
        transition={{ duration: TRANSITION_S, ease: EASE }}
      >
        <div className="pointer-events-none absolute -inset-[22%] rounded-full bg-indigo-500/14 blur-3xl dark:bg-indigo-500/28" />
        <div className="pointer-events-none absolute -inset-[14%] rounded-full bg-cyan-400/10 blur-2xl dark:bg-cyan-400/22" />
        <div className="pointer-events-none absolute -inset-[6%] rounded-full bg-violet-500/6 blur-xl dark:bg-violet-500/12" />
        <LoginGlobe className="relative z-10" size={layout.diameter} />
      </motion.div>

      {/* Login forma — chap chekkasi globusni aynan 30% qoplaydigan
          nuqtada, ekran holatidan qat'i nazar aniq hisoblanadi. */}
      <div
        className="absolute z-30 top-1/2 -translate-y-1/2 px-4"
        style={{ left: layout.cardLeft, width: layout.cardWidth }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: revealed ? 1 : 0,
            y: revealed ? 0 : 20,
          }}
          transition={{ duration: TRANSITION_S, ease: EASE, delay: revealed ? 0.12 : 0 }}
          className={`w-full ${!revealed ? "pointer-events-none" : ""}`}
        >
          <div className="glass-panel relative overflow-hidden p-8 shadow-2xl shadow-black/10 sm:p-10 dark:shadow-black/60">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(103,232,249,0.06) 0%, transparent 35%, transparent 65%, rgba(99,102,241,0.06) 100%)",
              }}
              aria-hidden
            />
            <div className="relative z-10">
            <div className="mb-8">
              <div className="mb-4 flex h-11 w-14 items-center justify-center rounded-xl border border-cyan-500/20 bg-white p-1.5 shadow-sm dark:border-cyan-400/20">
                <img
                  src="/logo.svg"
                  alt="World Textile Marketing Agency"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400/80">
                WTMA
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {t("auth.title")}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="username"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <UserIcon className="size-3.5 text-muted-foreground" />
                  {t("auth.login")}
                </Label>
                <Input
                  id="username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("auth.login")}
                  className="h-11 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20 dark:focus-visible:border-cyan-400/40 dark:focus-visible:ring-cyan-400/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <LockIcon className="size-3.5 text-muted-foreground" />
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20 dark:focus-visible:border-cyan-400/40 dark:focus-visible:ring-cyan-400/20"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="mt-1 h-11 w-full bg-indigo-500 text-base font-semibold text-white hover:bg-indigo-400"
              >
                {loading ? (
                  <>
                    <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    {t("auth.signingIn")}
                  </>
                ) : (
                  <>
                    <LogInIcon data-icon="inline-start" />
                    {t("auth.signIn")}
                  </>
                )}
              </Button>
            </form>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            World Textile Marketing Agency
          </p>
        </motion.div>
      </div>
    </div>
  );
}
