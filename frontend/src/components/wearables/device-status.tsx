"use client";

import { SurvivorDevice } from "@/hooks/use-survivor-websocket";
import { Battery, Wifi, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceStatusProps {
  device: SurvivorDevice;
}

export function DeviceStatus({ device }: DeviceStatusProps) {
  const getBatteryColor = (level: number) => {
    if (level > 60) return "text-emerald-500";
    if (level > 30) return "text-yellow-500";
    return "text-red-500";
  };

  const getSignalColor = (strength: number) => {
    if (strength >= 4) return "text-emerald-500";
    if (strength >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getBatteryIcon = (level: number) => {
    if (level > 80) return "fill-emerald-500";
    if (level > 60) return "text-emerald-500";
    if (level > 30) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Battery className={cn("h-4 w-4", getBatteryColor(device.battery_level))} />
          Battery
        </div>
        <span className={cn("font-medium", getBatteryColor(device.battery_level))}>
          {device.battery_level.toFixed(0)}%
        </span>
      </div>
      
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Wifi className={cn("h-4 w-4", getSignalColor(device.signal_strength))} />
          Signal
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-sm",
                i < device.signal_strength ? getSignalColor(device.signal_strength) : "bg-muted"
              )}
              style={{ height: `${(i + 1) * 3}px` }}
            />
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Zap className="h-4 w-4" />
          Temp
        </div>
        <span className="font-medium">{device.device_temperature.toFixed(1)}°C</span>
      </div>
      
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          Uptime
        </div>
        <span className="font-medium">{Math.floor(device.uptime_hours)}h</span>
      </div>
    </div>
  );
}
