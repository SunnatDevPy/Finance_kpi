import { useEffect, useState, type FormEvent } from "react";
import { Building2Icon, HistoryIcon, SettingsIcon, ShieldIcon, UserIcon } from "lucide-react";
import { api } from "../api/client";
import { KeyIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { RoleBadge } from "../components/UserBadges";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCellDate,
  TableCellMuted,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { usePreferences } from "../context/PreferencesContext";
import { formatDateTimeWithWeekday, toWholeAmountDigits } from "../utils/format";
import type { CompanyProfile, LoginHistoryEntry } from "../types";
import { FloatingLabelInput, FloatingLabelPhoneInput } from "@/components/ui/floating-label-input";
import { parsePhoneNational, toPhoneE164 } from "@/hooks/usePhoneInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, MoneyInput } from "@/components/ui/input";
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
  const [companyForm, setCompanyForm] = useState<CompanyProfile>({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_inn: "",
    company_bank_name: "",
    company_bank_account: "",
    company_mfo: "",
    company_director: "",
  });
  const [companyError, setCompanyError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState("");
  const [settingsLoadError, setSettingsLoadError] = useState("");

  useEffect(() => {
    setNotifyDaysInput(String(notifyDays));
  }, [notifyDays]);

  useEffect(() => {
    if (!isAdmin) return;
    setSettingsLoadError("");
    api.settings
      .get()
      .then((data) => {
        setMonthlyPlanInput(toWholeAmountDigits(data.monthly_plan));
        setCompanyForm({
          ...data.company,
          company_phone: parsePhoneNational(data.company.company_phone || ""),
        });
      })
      .catch((err) => {
        setSettingsLoadError(err instanceof Error ? err.message : t("common.error"));
      });
    setHistoryLoading(true);
    setHistoryLoadError("");
    api.audit
      .loginHistory(50)
      .then(setLoginHistory)
      .catch((err) => {
        setHistoryLoadError(err instanceof Error ? err.message : t("common.error"));
      })
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMonthlyPlanInput(toWholeAmountDigits(data.monthly_plan));
      setPlanSuccess(t("profile.monthlyPlanSaved"));
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setPlanLoading(false);
    }
  };

  const handleCompanySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCompanyError("");
    setCompanySuccess("");
    setCompanyLoading(true);
    try {
      const payload = {
        ...companyForm,
        company_phone: companyForm.company_phone
          ? toPhoneE164(companyForm.company_phone)
          : "",
      };
      const data = await api.settings.updateCompanyProfile(payload);
      setCompanyForm({
        ...data.company,
        company_phone: parsePhoneNational(data.company.company_phone || ""),
      });
      setCompanySuccess(t("profile.companyProfileSaved"));
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCompanyLoading(false);
    }
  };

  if (!user) return null;

  return (
    <PageShell className="max-w-2xl">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <StaggerContainer className="flex flex-col gap-8">
      <StaggerItem>
      <Card className="content-card">
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
              <dd className="mt-1">
                <RoleBadge role={user.role} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      </StaggerItem>

      <StaggerItem>
      <Card className="content-card">
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
      </StaggerItem>

      {isAdmin && (
        <StaggerItem>
        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-5" />
              {t("profile.systemSettings")}
            </CardTitle>
            <CardDescription>{t("profile.systemSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoadError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                {t("profile.settingsLoadError")}: {settingsLoadError}
              </p>
            )}
            {planError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{planError}</p>}
            {planSuccess && (
              <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{planSuccess}</p>
            )}
            <form onSubmit={handlePlanSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="monthly_plan">{t("profile.monthlyPlan")}</Label>
                <MoneyInput
                  id="monthly_plan"
                  required
                  value={monthlyPlanInput}
                  onValueChange={setMonthlyPlanInput}
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
        </StaggerItem>
      )}

      {isAdmin && (
        <StaggerItem>
        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-5" />
              {t("profile.companyProfile")}
            </CardTitle>
            <CardDescription>{t("profile.companyProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoadError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                {t("profile.settingsLoadError")}: {settingsLoadError}
              </p>
            )}
            {companyError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{companyError}</p>
            )}
            {companySuccess && (
              <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{companySuccess}</p>
            )}
            <form onSubmit={handleCompanySubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_name">{t("profile.companyName")}</Label>
                  <Input
                    id="company_name"
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  />
                </div>
                <FloatingLabelPhoneInput
                  id="company_phone"
                  label={t("profile.companyPhone")}
                  value={companyForm.company_phone}
                  onValueChange={(company_phone) =>
                    setCompanyForm({ ...companyForm, company_phone })
                  }
                />
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="company_address">{t("profile.companyAddress")}</Label>
                  <Input
                    id="company_address"
                    value={companyForm.company_address}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_address: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_inn">{t("profile.companyInn")}</Label>
                  <Input
                    id="company_inn"
                    value={companyForm.company_inn}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_inn: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_director">{t("profile.companyDirector")}</Label>
                  <Input
                    id="company_director"
                    value={companyForm.company_director}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_director: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_bank_name">{t("profile.companyBankName")}</Label>
                  <Input
                    id="company_bank_name"
                    value={companyForm.company_bank_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_bank_name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_bank_account">{t("profile.companyBankAccount")}</Label>
                  <Input
                    id="company_bank_account"
                    value={companyForm.company_bank_account}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, company_bank_account: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company_mfo">{t("profile.companyMfo")}</Label>
                  <Input
                    id="company_mfo"
                    value={companyForm.company_mfo}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_mfo: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={companyLoading} className="w-fit">
                {companyLoading ? (
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
        </StaggerItem>
      )}

      {isAdmin && (
        <StaggerItem>
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="size-5" />
              {t("profile.loginHistory")}
            </CardTitle>
            <CardDescription>{t("profile.loginHistoryDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoadError && (
              <p className="px-6 pt-4 text-sm text-red-600 dark:text-red-400">
                {t("profile.historyLoadError")}: {historyLoadError}
              </p>
            )}
            <PremiumDataTable
              loading={historyLoading}
              empty={!historyLoading && !historyLoadError && loginHistory.length === 0}
              emptyMessage={t("profile.loginHistoryEmpty")}
              skeletonCols={4}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("profile.loginHistoryUser")}</TableHead>
                  <TableHead>{t("auth.login")}</TableHead>
                  <TableHead>{t("profile.loginHistoryIp")}</TableHead>
                  <TableHead>{t("profile.loginHistoryTime")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.map((entry, index) => (
                  <MotionTableRow key={entry.id} {...rowEnter(index)}>
                    <TableCellPrimary>{entry.full_name}</TableCellPrimary>
                    <TableCellMuted>{entry.username}</TableCellMuted>
                    <TableCellMuted>{entry.ip_address ?? "—"}</TableCellMuted>
                    <TableCellDate>
                      {formatDateTimeWithWeekday(entry.logged_in_at)}
                    </TableCellDate>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          </CardContent>
        </Card>
        </StaggerItem>
      )}

      <StaggerItem>
      <Card className="content-card">
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
      </StaggerItem>
      </StaggerContainer>
    </PageShell>
  );
}
