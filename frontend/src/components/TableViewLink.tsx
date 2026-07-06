import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "../context/I18nContext";

/** Jadvaldagi "Ko'rish" tugmasi — yumaloq burchakli, bir xil uslub. */
export function TableViewLink({ to }: { to: string }) {
  const { t } = useI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-lg shadow-sm"
      render={<Link to={to} />}
    >
      {t("common.view")}
    </Button>
  );
}
