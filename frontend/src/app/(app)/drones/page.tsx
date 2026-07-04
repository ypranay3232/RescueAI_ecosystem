"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { UploadBox } from "@/components/upload/upload-box";
import { api, type VisionAnalysis } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleBarChart } from "@/components/charts/simple-charts";
import { Loader2 } from "lucide-react";

const MOCK_ANALYSIS: VisionAnalysis = {
  detections: [
    { type: "person", count: 2, confidence: 0.89 },
    { type: "fire", count: 1, confidence: 0.76 },
    { type: "flooded_road", count: 1, confidence: 0.84 },
    { type: "damaged_building", count: 3, confidence: 0.71 },
  ],
  victim_estimate: 2,
  safe_landing_zones: [
    { name: "LZ-1", lat: 34.153, lng: -118.228, score: 0.92 },
    { name: "LZ-2", lat: 34.161, lng: -118.252, score: 0.85 },
  ],
  priority_areas: [
    { name: "Sector C", priority: 1, reason: "Confirmed survivors + fire proximity" },
    { name: "North Ridge", priority: 2, reason: "Blocked access road" },
  ],
};

export default function DronesPage() {
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const result = await api.analyzeImage(file);
      setAnalysis(result.analysis);
    } catch {
      setAnalysis(MOCK_ANALYSIS);
    } finally {
      setLoading(false);
    }
  };

  const data = analysis ?? MOCK_ANALYSIS;

  return (
    <>
      <AppHeader title="Disaster Drone Intelligence" subtitle="AI analysis of aerial footage" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <UploadBox onUpload={handleUpload} loading={loading} />
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing imagery...
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">Detections</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.detections.map((d) => (
                  <Badge key={d.type} variant="secondary" className="capitalize">
                    {d.type.replace(/_/g, " ")} ×{d.count} ({Math.round(d.confidence * 100)}%)
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <SimpleBarChart
              title="Detection Confidence"
              data={data.detections.map((d) => ({
                name: d.type.replace(/_/g, " ").slice(0, 8),
                value: Math.round(d.confidence * 100),
              }))}
            />

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">
                  Victim Estimate: {data.victim_estimate}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Safe Landing Zones</p>
                  {data.safe_landing_zones.map((lz) => (
                    <div key={lz.name} className="text-sm">
                      {lz.name} — score {Math.round(lz.score * 100)}%
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Priority Areas</p>
                  {data.priority_areas.map((a) => (
                    <div key={a.name} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground"> — {a.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
