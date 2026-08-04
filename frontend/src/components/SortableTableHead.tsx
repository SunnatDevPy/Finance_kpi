import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { TableHead } from "@/components/PremiumDataTable";
import { cn } from "@/lib/utils";

export type TableSortOrder = "asc" | "desc";

interface SortableTableHeadProps<T extends string> {
  label: string;
  column: T;
  activeColumn: T;
  order: TableSortOrder;
  onSort: (column: T) => void;
  className?: string;
}

export function SortableTableHead<T extends string>({
  label,
  column,
  activeColumn,
  order,
  onSort,
  className,
}: SortableTableHeadProps<T>) {
  const active = column === activeColumn;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
          className?.includes("text-right") && "ml-auto",
        )}
        onClick={() => onSort(column)}
        aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {active ? (
          order === "asc" ? (
            <ArrowUpIcon className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDownIcon className="size-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}
