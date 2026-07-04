import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface CompanyAvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function CompanyAvatar({ name, size = "md", className }: CompanyAvatarProps) {
  const palette = PALETTE[hashString(name) % PALETTE.length];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight",
        size === "sm" ? "size-7 text-[11px]" : "size-9 text-xs",
        palette,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
