"use client";

import { AppHeader } from "@/components/layout/app-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AIRecommendationCard } from "@/components/dashboard/ai-recommendation-card";
import { RescueMap } from "@/components/maps/rescue-map";
import { WeatherChart } from "@/components/charts/simple-charts";
import {
  DASHBOARD_METRICS,
  MOCK_DRONE_ROUTES,
  MOCK_RECOMMENDATIONS,
  MOCK_SEARCH_ZONE,
  MOCK_SURVIVORS,
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <>
      <AppHeader
        title="Command Center"
        subtitle="Real-time emergency coordination dashboard"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DASHBOARD_METRICS.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Operational Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RescueMap
                  searchZone={MOCK_SEARCH_ZONE}
                  routes={MOCK_DRONE_ROUTES}
                  survivors={MOCK_SURVIVORS}
                  showHeatmap
                  height="420px"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <AIRecommendationCard
              recommendations={MOCK_RECOMMENDATIONS}
              summary="Deploy aerial assets to Sector C; ground teams stage at LZ-2."
              riskLevel="high"
            />
            <WeatherChart
              title="Weather Forecast"
              data={[
                { name: "+1h", rain: 2.1, wind: 14 },
                { name: "+2h", rain: 8.4, wind: 22 },
                { name: "+3h", rain: 12, wind: 18 },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
