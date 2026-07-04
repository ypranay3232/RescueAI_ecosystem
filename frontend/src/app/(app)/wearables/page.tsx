"use client";

import { AppHeader } from "@/components/layout/app-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RescueMap } from "@/components/maps/rescue-map";
import { MOCK_SURVIVORS } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Thermometer } from "lucide-react";

export default function WearablesPage() {
  return (
    <>
      <AppHeader title="Survivor Wearables" subtitle="Live GPS & vitals from rescue devices" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            {MOCK_SURVIVORS.map((s) => (
              <Card key={s.id} className="border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{s.name}</CardTitle>
                  <StatusBadge status={s.status} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400" />
                    {s.heartRate} bpm
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-blue-400" />
                    {s.temperature}°C
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    Movement: {s.movement}
                  </div>
                  <p className="text-xs text-muted-foreground">Updated {s.lastUpdate}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Survivor Locations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RescueMap survivors={MOCK_SURVIVORS} height="500px" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
