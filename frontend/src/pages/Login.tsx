import { useState, useEffect, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogInIcon, Loader2Icon, LockIcon, UserIcon, AlertCircleIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { SettingsToolbar } from "../components/SettingsToolbar";
import { LoginAtmosphere } from "../components/login/LoginAtmosphere";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EASE = [0.16, 1, 0.3, 1] as const;

function LoginFormCard({
  t,
  username,
  password,
  error,
  loading,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: {
  t: (key: string) => string;
  username: string;
  password: string;
  error: string;
  loading: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="glass-panel relative overflow-hidden p-6 shadow-2xl shadow-black/10 sm:p-10 dark:shadow-black/60">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(103,232,249,0.06) 0%, transparent 35%, transparent 65%, rgba(99,102,241,0.06) 100%)",
        }}
        aria-hidden
      />
      <div className="relative z-10">
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex h-11 w-14 items-center justify-center rounded-xl border border-cyan-500/20 bg-white p-1.5 shadow-sm dark:border-cyan-400/20">
            <img
              src="/logo.png"
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

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
              onChange={(e) => onUsernameChange(e.target.value)}
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
              onChange={(e) => onPasswordChange(e.target.value)}
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
  );
}

function LoginFooter() {
  return (
    <p className="mt-5 text-center text-xs text-muted-foreground sm:mt-6">
      World Textile Marketing Agency
    </p>
  );
}

export function LoginPage() {
  const { user, login, sessionExpired, clearSessionExpired } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => (sessionExpired ? t("auth.sessionExpired") : ""));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      setError(t("auth.sessionExpired"));
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired, t]);

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

  const formProps = {
    t,
    username,
    password,
    error,
    loading,
    onUsernameChange: setUsername,
    onPasswordChange: setPassword,
    onSubmit: handleSubmit,
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-background px-4 py-10 text-foreground">
      <LoginAtmosphere revealed lite />

      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <SettingsToolbar variant="login" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative z-10 w-full max-w-md"
      >
        <LoginFormCard {...formProps} />
        <LoginFooter />
      </motion.div>
    </div>
  );
}
