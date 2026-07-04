import { useEffect, useState, type FormEvent } from "react";
import { SettingsIcon, ShieldIcon, UserIcon } from "lucide-react";
import { api } from "../api/client";
import { KeyIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { usePreferences } from "../context/PreferencesContext";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();
  const { notifyDays, setNotifyDays } = usePreferences();
  const [error, setError] = useState("");
  const [prefsError, setPrefsError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState("");
  const [notifyDaysInput, setNotifyDaysInput] = useState(String(notifyDays));
  const [monthlyPlanInput, setMonthlyPlanInput] = useState("");
  const [planError, setPlanError] = useState("");
  const [planSuccess, setPlanSuccess] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    setNotifyDaysInput(String(notifyDays));
  }, [notifyDays]);

  useEffect(() => {
    if (!isAdmin) return;
    api.settings
      .get()
      .then((data) => setMonthlyPlanInput(data.monthly_plan))
      .catch(() => {});
  }, [isAdmin]);

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password !== form.confirm_password) {
      setError(t("profile.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword(form.current_password, form.new_password);
      setSuccess(t("profile.passwordChanged"));
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setError(msg.includes("noto'g'ri") || msg.includes("Неверный") ? t("profile.wrongPassword") : msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrefsSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPrefsSuccess("");
    setPrefsError("");
    const value = Number.parseInt(notifyDaysInput, 10);
    if (Number.isNaN(value) || value < 1 || value > 365) {
      setPrefsError(t("profile.notifyDaysInvalid"));
      return;
    }
    setNotifyDays(value);
    setPrefsSuccess(t("profile.prefsSaved"));
  };

  const handlePlanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPlanError("");
    setPlanSuccess("");
    const value = Number.parseFloat(monthlyPlanInput);
    if (Number.isNaN(value) || value <= 0) {
      setPlanError(t("profile.monthlyPlanInvalid"));
      return;
    }
    setPlanLoading(true);
    try {
      const data = await api.settings.updateMonthlyPlan(value);
      setMonthlyPlanInput(data.monthly_plan);
      setPlanSuccess(t("profile.monthlyPlanSaved"));
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setPlanLoading(false);
    }
  };

  if (!user) return null;

  return (
    <PageShell className="max-w-2xl">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            {t("profile.accountInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="info-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt>{t("employees.fullName")}</dt>
              <dd>{user.full_name}</dd>
            </div>
            <div>
              <dt>{t("auth.login")}</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>{t("employees.role")}</dt>
              <dd>{t(`roles.${user.role}`)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="size-5" />
            {t("profile.preferences")}
          </CardTitle>
          <CardDescription>{t("profile.preferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {prefsError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{prefsError}</p>}
          {prefsSuccess && (
            <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{prefsSuccess}</p>
          )}
          <form onSubmit={handlePrefsSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="notify_days">{t("profile.notifyDays")}</Label>
              <Input
                id="notify_days"
                type="number"
                min={1}
                max={365}
                required
                value={notifyDaysInput}
                onChange={(e) => setNotifyDaysInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("profile.notifyDaysHint")}</p>
            </div>
            <Button type="submit">
              <SaveIconBtn />
              {t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-5" />
              {t("profile.systemSettings")}
            </CardTitle>
            <CardDescription>{t("profile.systemSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {planError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{planError}</p>}
            {planSuccess && (
              <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{planSuccess}</p>
            )}
            <form onSubmit={handlePlanSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="monthly_plan">{t("profile.monthlyPlan")}</Label>
                <Input
                  id="monthly_plan"
                  type="number"
                  min={1}
                  required
                  value={monthlyPlanInput}
                  onChange={(e) => setMonthlyPlanInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("profile.monthlyPlanHint")}</p>
              </div>
              <Button type="submit" disabled={planLoading}>
                {planLoading ? (
                  <>
                    <LoadingIconBtn />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <SaveIconBtn />
                    {t("common.save")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.changePassword")}</CardTitle>
          <CardDescription>{t("profile.changePasswordDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PageError message={error} />
          {success && (
            <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FloatingLabelInput
              id="current"
              type="password"
              label={t("profile.currentPassword")}
              required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
            <FloatingLabelInput
              id="new"
              type="password"
              label={t("profile.newPassword")}
              required
              minLength={6}
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
            <FloatingLabelInput
              id="confirm"
              type="password"
              label={t("profile.confirmPassword")}
              required
              minLength={6}
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingIconBtn />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <KeyIconBtn />
                  {t("common.save")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
