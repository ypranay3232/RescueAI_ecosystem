"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { api, type ResourcesData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, Package, Users } from "lucide-react";

const statusColor: Record<string, string> = {
  deployed: "bg-orange-500/15 text-orange-400",
  active: "bg-emerald-500/15 text-emerald-400",
  en_route: "bg-blue-500/15 text-blue-400",
  available: "bg-emerald-500/15 text-emerald-400",
  standby: "bg-muted text-muted-foreground",
  grounded: "bg-red-500/15 text-red-400",
  adequate: "bg-emerald-500/15 text-emerald-400",
  low: "bg-amber-500/15 text-amber-400",
};

export default function ResourcesPage() {
  const [data, setData] = useState<ResourcesData | null>(null);

  useEffect(() => {
    api.resources().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <>
        <AppHeader title="Resource Management" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading resources...
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Resource Management" subtitle="Operational control center inventory" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" /> Rescue Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location} · {t.members} members</p>
                  </div>
                  <Badge className={statusColor[t.status]}>{t.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Battery className="h-4 w-4" /> Drones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.drones.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.location ?? d.reason} · {d.battery_pct}% battery
                    </p>
                  </div>
                  <Badge className={statusColor[d.status]}>{d.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" /> Supplies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.supplies.map((s) => (
                <div key={s.item} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{s.item}</p>
                    <p className="text-xs text-muted-foreground">Qty: {s.qty}</p>
                  </div>
                  <Badge className={statusColor[s.status]}>{s.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
