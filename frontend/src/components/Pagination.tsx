import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { cn } from "@/lib/utils";
import { MotionButton } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  embedded?: boolean
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  embedded = false,
}: PaginationProps) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const pages: number[] = [];
  const start = Math.max(1, safePage - 2);
  const end = Math.min(totalPages, safePage + 2);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
        !embedded && "border-t pt-3",
      )}
    >
      <p className="shrink-0 text-xs text-muted-foreground sm:text-sm">
        {t("pagination.showing")
          .replace("{from}", String(from))
          .replace("{to}", String(to))
          .replace("{total}", String(total))}
      </p>

      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-0.5">
          <MotionButton
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label={t("pagination.prev")}
            whileTap={safePage <= 1 ? undefined : { scale: 0.92 }}
            transition={{ duration: 0.1 }}
          >
            <ChevronLeftIcon className="size-4" />
          </MotionButton>

          {pages.map((p) => (
            <MotionButton
              key={p}
              type="button"
              variant={p === safePage ? "default" : "outline"}
              size="icon-sm"
              className="min-w-8"
              onClick={() => onPageChange(p)}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.1 }}
            >
              {p}
            </MotionButton>
          ))}

          <MotionButton
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label={t("pagination.next")}
            whileTap={safePage >= totalPages ? undefined : { scale: 0.92 }}
            transition={{ duration: 0.1 }}
          >
            <ChevronRightIcon className="size-4" />
          </MotionButton>
        </div>

        <Select
          className="w-auto shrink-0"
          value={String(pageSize)}
          onValueChange={(value) => value && onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[6.75rem] shrink-0" aria-label={t("pagination.perPage")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / {t("pagination.pageShort")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
