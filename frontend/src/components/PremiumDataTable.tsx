import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { InboxIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { CompanyAvatar } from "./CompanyAvatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PremiumDataTableProps {
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  skeletonRows?: number
  skeletonCols?: number
  footer?: ReactNode
  children: ReactNode
  className?: string
}

function SkeletonBar({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      initial={{ opacity: 0.35 }}
      animate={{ opacity: [0.35, 0.75, 0.35] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  )
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="glass-panel shine-border overflow-hidden rounded-xl">
      <div className="border-b bg-muted/30 px-5 py-3.5 backdrop-blur-sm">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBar key={i} className="h-3 flex-1" delay={i * 0.05} />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, row) => (
          <motion.div
            key={row}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: row * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={cn(
              "flex items-center gap-4 border-b border-border/40 px-5 py-4 last:border-0",
              row % 2 === 1 && "bg-muted/15",
            )}
          >
            {Array.from({ length: cols }).map((_, col) => (
              <SkeletonBar
                key={col}
                className={cn("h-4", col === 0 ? "w-1/3" : "flex-1")}
                delay={row * 0.04 + col * 0.03}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function TableEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <InboxIcon className="size-5" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

const tableInset = "px-4 pb-4 sm:px-5 sm:pb-5"

export function PremiumDataTable({
  loading = false,
  empty = false,
  emptyMessage = "Ma'lumot yo'q",
  skeletonRows = 6,
  skeletonCols = 5,
  footer,
  children,
  className,
}: PremiumDataTableProps) {
  if (loading) {
    return (
      <div className={cn(tableInset, className)}>
        <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
      </div>
    )
  }

  if (empty) {
    return (
      <div className={cn(tableInset, className)}>
        <TableEmpty message={emptyMessage} />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", tableInset, className)}>
      <div className="glass-panel shine-border overflow-hidden rounded-xl">
        <Table variant="default">{children}</Table>
      </div>
      {footer ? (
        <div className="-mt-px rounded-b-xl border border-t-0 border-border/50 bg-muted/15 px-4 py-2 sm:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

interface TableCellTextProps {
  children: ReactNode
  className?: string
  subtitle?: string
}

export function TableCellPrimary({ children, className, subtitle }: TableCellTextProps) {
  return (
    <TableCell className={className}>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-foreground">{children}</span>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
    </TableCell>
  )
}

export function TableCellMuted({ children, className }: TableCellTextProps) {
  return (
    <TableCell className={cn("text-muted-foreground", className)}>
      {children || "—"}
    </TableCell>
  )
}

export function TableCellDate({ children, className }: TableCellTextProps) {
  return (
    <TableCell className={cn("font-medium tabular-nums text-foreground/90", className)}>
      {children}
    </TableCell>
  )
}

type MoneyTone = "positive" | "negative" | "neutral"

export function TableCellMoney({
  children,
  className,
  tone = "neutral",
}: TableCellTextProps & { tone?: MoneyTone }) {
  return (
    <TableCell
      className={cn(
        "font-semibold tabular-nums",
        tone === "positive" && "text-emerald-600 dark:text-emerald-400",
        tone === "negative" && "text-red-600 dark:text-red-400",
        tone === "neutral" && "text-foreground",
        className,
      )}
    >
      {children}
    </TableCell>
  )
}

interface TableCellLinkProps {
  to: string
  children: ReactNode
  subtitle?: string
  className?: string
}

export function TableCellLink({ to, children, subtitle, className }: TableCellLinkProps) {
  return (
    <TableCell className={className}>
      <div className="flex flex-col gap-0.5">
        <Link
          to={to}
          className="link-surface font-semibold text-primary"
        >
          {children}
        </Link>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
    </TableCell>
  )
}

interface TableCellCompanyProps {
  to: string
  name: string
  subtitle?: string
  className?: string
  logoUrl?: string | null
}

export function TableCellCompany({ to, name, subtitle, className, logoUrl }: TableCellCompanyProps) {
  return (
    <TableCell className={className}>
      <div className="flex items-center gap-2.5">
        <CompanyAvatar name={name} size="sm" logoUrl={logoUrl} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={to}
            className="link-surface truncate font-semibold text-primary"
          >
            {name}
          </Link>
          {subtitle ? (
            <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </div>
      </div>
    </TableCell>
  )
}

export function TableCellActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TableCell className={cn("text-right", className)}>
      <div className="flex justify-end gap-2">{children}</div>
    </TableCell>
  )
}

/** Animated table row — fades/slides each row in, staggered by index. Use for freshly-loaded pages of data. */
export const MotionTableRow = motion.create(TableRow)

/** Props for `MotionTableRow`; caps the stagger delay so long tables don't cascade for seconds. */
export function rowEnter(index: number) {
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.22,
      delay: Math.min(index, 12) * 0.025,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }
}

export { TableHeader, TableBody, TableRow, TableHead, TableCell }
