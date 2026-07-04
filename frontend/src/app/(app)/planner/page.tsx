"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AIRecommendationCard } from "@/components/dashboard/ai-recommendation-card";
import { api } from "@/lib/api";
import { MOCK_RECOMMENDATIONS } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export default function PlannerPage() {
  const [recommendations, setRecommendations] = useState(MOCK_RECOMMENDATIONS);
  const [summary, setSummary] = useState("Deploy aerial assets to Sector C; ground teams stage at LZ-2.");
  const [riskLevel, setRiskLevel] = useState("high");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await api.recommend({
        incident: "missing aircraft",
        survivors: 3,
        drones_available: 2,
        weather_risk: "high wind in 18 min",
        detections: ["2 persons Sector C", "1 fire", "1 flooded road"],
      });
      if (result.actions) setRecommendations(result.actions);
      if (result.summary) setSummary(result.summary);
      if (result.risk_level) setRiskLevel(result.risk_level);
    } catch {
      setRecommendations(MOCK_RECOMMENDATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <AppHeader title="AI Rescue Planner" subtitle="Decision support — not just analytics" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate Plan
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AIRecommendationCard
            recommendations={recommendations}
            summary={summary}
            riskLevel={riskLevel}
          />

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm">Scenario Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Aircraft lost contact 23 min ago — search zone active</p>
              <p>• Drone 2 detecting 2 survivors in Sector C</p>
              <p>• Survivor Gamma (wearable) in RED status</p>
              <p>• Storm approaching — 22 m/s gusts in 18 min</p>
              <p>• Ambulance Alpha en route, ETA 12 min</p>
              <p>• Life vests supply LOW — reorder recommended</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
