import { useState } from "react";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

interface CardPdfButtonProps {
  onExport: () => Promise<void>;
  className?: string;
}

export function CardPdfButton({ onExport, className }: CardPdfButtonProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1.5 px-3", className)}
      disabled={loading}
      onClick={handleClick}
      aria-busy={loading}
    >
      {loading ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <FileTextIcon className="size-3.5" />
      )}
      {t("export.pdf")}
    </Button>
  );
}
