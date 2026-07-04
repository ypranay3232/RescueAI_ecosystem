"use client";

import { SurvivorAlerts } from "@/hooks/use-survivor-websocket";
import { AlertTriangle, Activity, Thermometer, Droplets, Heart, Battery, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  alerts: SurvivorAlerts;
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.medical.length === 0 && !alerts.panic_button && alerts.falls_detected === 0) {
    return null;
  }

  const getAlertIcon = (alert: string) => {
    if (alert.includes("heart") || alert.includes("blood_pressure")) return <Heart className="h-4 w-4" />;
    if (alert.includes("temp")) return <Thermometer className="h-4 w-4" />;
    if (alert.includes("oxygen")) return <Droplets className="h-4 w-4" />;
    if (alert.includes("activity") || alert.includes("falls")) return <Activity className="h-4 w-4" />;
    if (alert.includes("battery")) return <Battery className="h-4 w-4" />;
    if (alert.includes("signal")) return <Wifi className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getAlertLabel = (alert: string) => {
    const labels: Record<string, string> = {
      "abnormal_heart_rate": "Abnormal Heart Rate",
      "extreme_temperature": "Extreme Temperature",
      "low_oxygen": "Low Oxygen Saturation",
      "critical_blood_pressure": "Critical Blood Pressure",
      "panic_button": "PANIC BUTTON PRESSED",
      "elevated_heart_rate": "Elevated Heart Rate",
      "elevated_temperature": "Elevated Temperature",
      "reduced_oxygen": "Reduced Oxygen",
      "low_battery": "Low Battery",
      "weak_signal": "Weak Signal",
      "reduced_activity": "Reduced Activity",
    };
    return labels[alert] || alert.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const isCritical = alerts.panic_button || alerts.falls_detected > 0;

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      isCritical ? "bg-red-500/10 border-red-500/50" : "bg-yellow-500/10 border-yellow-500/50"
    )}>
      {alerts.panic_button && (
        <div className="flex items-center gap-2 text-red-500 animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-semibold">PANIC BUTTON ACTIVATED - IMMEDIATE ATTENTION REQUIRED</span>
        </div>
      )}
      
      {alerts.falls_detected > 0 && (
        <div className="flex items-center gap-2 text-red-500">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {alerts.falls_detected} Fall{alerts.falls_detected > 1 ? "s" : ""} Detected
          </span>
        </div>
      )}
      
      {alerts.medical.length > 0 && (
        <div className="space-y-1">
          {alerts.medical.map((alert, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              {getAlertIcon(alert)}
              <span>{getAlertLabel(alert)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
