"use client";

import { useState } from "react";
import { SurvivorHistory } from "@/hooks/use-survivor-websocket";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface VitalsChartProps {
  history: SurvivorHistory;
}

export function VitalsChart({ history }: VitalsChartProps) {
  const [activeTab, setActiveTab] = useState<"hr" | "spo2" | "temp">("hr");

  const chartData = history.heart_rate.map((hr, idx) => ({
    name: `${idx + 1}`,
    hr: hr,
    spo2: history.oxygen_saturation[idx],
    temp: history.temperature[idx] ? parseFloat(history.temperature[idx].toFixed(1)) : 37.0,
  }));

  const config = {
    hr: {
      key: "hr",
      label: "Heart Rate",
      color: "#ef4444",
      fill: "url(#colorHr)",
      unit: " bpm",
      domain: [40, 180],
    },
    spo2: {
      key: "spo2",
      label: "SpO2",
      color: "#10b981",
      fill: "url(#colorSpo2)",
      unit: "%",
      domain: [80, 100],
    },
    temp: {
      key: "temp",
      label: "Temp",
      color: "#3b82f6",
      fill: "url(#colorTemp)",
      unit: "°C",
      domain: [34, 42],
    },
  };

  const active = config[activeTab];

  return (
    <div className="space-y-2">
      {/* Mini tabs */}
      <div className="flex justify-between items-center bg-muted/40 rounded-lg p-0.5 border border-border/10">
        <button
          type="button"
          onClick={() => setActiveTab("hr")}
          className={`flex-1 text-[10px] font-medium py-1 px-2 rounded-md transition-all cursor-pointer ${
            activeTab === "hr"
              ? "bg-background text-red-500 shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Heart Rate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("spo2")}
          className={`flex-1 text-[10px] font-medium py-1 px-2 rounded-md transition-all cursor-pointer ${
            activeTab === "spo2"
              ? "bg-background text-emerald-500 shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          SpO2
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("temp")}
          className={`flex-1 text-[10px] font-medium py-1 px-2 rounded-md transition-all cursor-pointer ${
            activeTab === "temp"
              ? "bg-background text-blue-500 shadow-sm border border-border/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Temp
        </button>
      </div>

      {/* Chart container */}
      <div className="relative h-28 w-full overflow-hidden rounded-lg bg-card/40 border border-border/20 p-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis dataKey="name" hide />
            <YAxis
              domain={active.domain}
              tick={{ fill: "#888", fontSize: 8 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(51, 65, 85, 0.5)",
                borderRadius: "6px",
                fontSize: "10px",
                padding: "4px 8px",
              }}
              labelStyle={{ display: "none" }}
              formatter={(value: any) => [`${value}${active.unit}`, active.label]}
            />
            <Area
              type="monotone"
              dataKey={active.key}
              stroke={active.color}
              strokeWidth={1.5}
              fill={active.fill}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
