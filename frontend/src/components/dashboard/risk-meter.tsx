"use client";

import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  label?: string;
  className?: string;
}

export function RiskMeter({ score, label = "Risk Level", className }: RiskMeterProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 75 ? "from-red-500 to-red-600" : clamped >= 45 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
