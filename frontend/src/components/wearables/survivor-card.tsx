"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Battery, 
  Wifi, 
  AlertTriangle,
  MapPin,
  Clock,
  Zap,
  Droplets,
  Wind,
  Gauge,
  Download
} from "lucide-react";
import { SurvivorData } from "@/hooks/use-survivor-websocket";
import { VitalsChart } from "./vitals-chart";
import { AlertBanner } from "./alert-banner";
import { DeviceStatus } from "./device-status";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface SurvivorCardProps {
  survivor: SurvivorData;
  onPanicTrigger?: (id: string) => void;
}

export function SurvivorCard({ survivor, onPanicTrigger }: SurvivorCardProps) {
  const timeSinceUpdate = formatDistanceToNow(new Date(survivor.last_update), { addSuffix: true });

  const handleExportCSV = (s: SurvivorData) => {
    const headers = "Reading,Heart_Rate_BPM,Oxygen_Saturation_Pct,Temperature_C\n";
    const rows = s.history.heart_rate.map((hr, idx) => {
      const temp = s.history.temperature[idx] ? s.history.temperature[idx].toFixed(1) : "37.0";
      const spo2 = s.history.oxygen_saturation[idx] || "98";
      return `${idx + 1},${hr},${spo2},${temp}`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${s.name.replace(/\s+/g, "_")}_vitals_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getHeartRateColor = (hr: number) => {
    if (hr > 140 || hr < 50) return "text-red-500";
    if (hr > 120 || hr < 55) return "text-yellow-500";
    return "text-emerald-500";
  };

  const getTempColor = (temp: number) => {
    if (temp > 39.0 || temp < 35.5) return "text-red-500";
    if (temp > 37.6 || temp < 36.0) return "text-yellow-500";
    return "text-blue-500";
  };

  const getOxygenColor = (sat: number) => {
    if (sat < 90) return "text-red-500";
    if (sat < 95) return "text-yellow-500";
    return "text-emerald-500";
  };

  return (
    <Card className={`border-border/60 transition-all hover:shadow-lg ${
      survivor.status === "red" ? "border-red-500/50 bg-red-500/5" :
      survivor.status === "yellow" ? "border-yellow-500/50 bg-yellow-500/5" :
      ""
    }`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Heart className={`h-5 w-5 ${getHeartRateColor(survivor.vitals.heart_rate)}`} />
          </div>
          <div>
            <CardTitle className="text-base">{survivor.name}</CardTitle>
            <p className="text-xs text-muted-foreground">ID: {survivor.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={survivor.status} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeSinceUpdate}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alerts Banner */}
        {survivor.alerts.medical.length > 0 && (
          <AlertBanner alerts={survivor.alerts} />
        )}

        {/* Primary Vitals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              Heart Rate
            </div>
            <div className={`text-lg font-semibold ${getHeartRateColor(survivor.vitals.heart_rate)}`}>
              {survivor.vitals.heart_rate}
              <span className="text-xs font-normal text-muted-foreground">bpm</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Thermometer className="h-3 w-3" />
              Temp
            </div>
            <div className={`text-lg font-semibold ${getTempColor(survivor.vitals.temperature)}`}>
              {survivor.vitals.temperature}
              <span className="text-xs font-normal text-muted-foreground">°C</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Droplets className="h-3 w-3" />
              SpO2
            </div>
            <div className={`text-lg font-semibold ${getOxygenColor(survivor.vitals.oxygen_saturation)}`}>
              {survivor.vitals.oxygen_saturation}
              <span className="text-xs font-normal text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Secondary Vitals */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
            <span className="text-muted-foreground">Blood Pressure</span>
            <span className="font-medium">{survivor.vitals.blood_pressure.systolic}/{survivor.vitals.blood_pressure.diastolic}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
            <span className="text-muted-foreground">Respiratory</span>
            <span className="font-medium">{survivor.vitals.respiratory_rate}/min</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
            <span className="text-muted-foreground">Stress Level</span>
            <span className={`font-medium ${
              survivor.vitals.stress_level > 70 ? "text-red-500" :
              survivor.vitals.stress_level > 50 ? "text-yellow-500" : "text-emerald-500"
            }`}>
              {survivor.vitals.stress_level}%
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
            <span className="text-muted-foreground">Activity</span>
            <span className={`font-medium capitalize ${
              survivor.activity.level === "active" ? "text-emerald-500" :
              survivor.activity.level === "limited" ? "text-yellow-500" : "text-red-500"
            }`}>
              {survivor.activity.level}
            </span>
          </div>
        </div>

        {/* Location Info */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lat: {survivor.lat.toFixed(4)}</span>
              <span className="text-muted-foreground">Lng: {survivor.lng.toFixed(4)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Alt: {survivor.location.altitude}m</span>
              <span className="text-muted-foreground">Speed: {survivor.activity.speed.toFixed(1)}m/s</span>
            </div>
          </div>
        </div>

        {/* Device Status */}
        <DeviceStatus device={survivor.device} />

        {/* Vitals Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Vitals Trend (Last 20 readings)</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleExportCSV(survivor)}
              className="text-[10px] h-5 py-0 px-1.5 gap-1 border border-border/10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Download className="h-2.5 w-2.5" />
              Export
            </Button>
          </div>
          <VitalsChart history={survivor.history} />
        </div>

        {/* Panic Button */}
        {!survivor.alerts.panic_button && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onPanicTrigger?.(survivor.id)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Trigger Panic Alert
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
