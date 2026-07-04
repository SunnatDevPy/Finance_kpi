import { AlertCircleIcon } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PageError({ message }: { message: string }) {
  const { t } = useI18n();
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{t("common.error")}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
