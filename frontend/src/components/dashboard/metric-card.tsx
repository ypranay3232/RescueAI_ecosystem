"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ label, value, change, trend = "neutral", className }: MetricCardProps) {
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-orange-500/5",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {change && <p className={cn("mt-1 text-xs", trendColor)}>{change}</p>}
    </motion.div>
  );
}
