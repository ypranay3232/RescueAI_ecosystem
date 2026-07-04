import { cn } from "@/lib/utils";
import type { StatusLevel } from "@/lib/mock-data";

const styles: Record<StatusLevel, string> = {
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse",
};

const labels: Record<StatusLevel, string> = {
  green: "Safe",
  yellow: "Attention",
  red: "Emergency",
};

interface StatusBadgeProps {
  status: StatusLevel;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
