import { useRef, useState } from "react";
import { Trash2Icon, UploadCloudIcon } from "lucide-react";
import { api } from "@/api/client";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { MotionButton, motionTap } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import type { Client } from "@/types";

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

interface ClientLogoUploaderProps {
  client: Pick<Client, "id" | "company_name" | "logo_url">;
  onUpdated: (client: Client) => void;
  size?: "md" | "lg";
}

export function ClientLogoUploader({ client, onUpdated, size = "md" }: ClientLogoUploaderProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.clients.uploadLogo(client.id, file);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.clients.deleteLogo(client.id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const avatarClassName = size === "lg" ? "size-20 rounded-xl text-2xl" : "size-14 rounded-xl text-base";

  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={client.company_name} logoUrl={client.logo_url} className={avatarClassName} />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <MotionButton
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            {...motionTap}
          >
            <UploadCloudIcon data-icon="inline-start" />
            {t("clients.uploadLogo")}
          </MotionButton>
          {client.logo_url && (
            <MotionButton
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={handleRemove}
              {...motionTap}
            >
              <Trash2Icon data-icon="inline-start" />
              {t("common.delete")}
            </MotionButton>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("clients.logoHint")}</p>
        )}
      </div>
    </div>
  );
}
