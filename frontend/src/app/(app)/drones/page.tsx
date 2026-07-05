"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { UploadBox } from "@/components/upload/upload-box";
import { api, type VisionAnalysis, API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleBarChart } from "@/components/charts/simple-charts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const SAMPLE_DATASET = [
  { name: "images.jpg", title: "Forest Search Area", description: "Dense wilderness searching for survivors" },
  { name: "imagess.jpg", title: "Rocky Terrain", description: "Steep mountain crevices rescue region" }
];

export default function DronesPage() {
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("yolo11n");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeImage(file, undefined, selectedModel);
      setAnalysis(result.analysis);
    } catch (err) {
      console.error('Analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image';
      setError(errorMessage);
      // Fall back to mock data on error
      setAnalysis(MOCK_ANALYSIS);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleAnalyze = async (sampleName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeImage(undefined, sampleName, selectedModel);
      setAnalysis(result.analysis);
    } catch (err) {
      console.error('Sample analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze sample';
      setError(errorMessage);
      // Fall back to mock data on error
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
          {/* Left Column: Upload & Model Selector & Sample Dataset */}
          <div className="space-y-4">
            <UploadBox onUpload={handleUpload} loading={loading} />
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                Analyzing imagery with YOLO...
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <p className="font-medium">Analysis Error</p>
                <p className="text-xs opacity-80">{error}</p>
                <p className="text-xs mt-1 opacity-60">Showing mock data instead</p>
              </div>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Detection Model Selection</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedModel === "yolo11n" ? "default" : "outline"}
                  onClick={() => setSelectedModel("yolo11n")}
                  className={`flex flex-col items-start p-4 h-auto text-left gap-1 ${
                    selectedModel === "yolo11n" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                  }`}
                >
                  <span className="font-semibold text-xs">YOLO11n (Fast)</span>
                  <span className="text-[10px] opacity-70">5.6 MB • Quick inference</span>
                </Button>
                <Button
                  variant={selectedModel === "yolo11m" ? "default" : "outline"}
                  onClick={() => setSelectedModel("yolo11m")}
                  className={`flex flex-col items-start p-4 h-auto text-left gap-1 ${
                    selectedModel === "yolo11m" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                  }`}
                >
                  <span className="font-semibold text-xs">YOLO11m (Accurate)</span>
                  <span className="text-[10px] opacity-70">40.7 MB • High precision</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Sample Dataset Library</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {SAMPLE_DATASET.map((sample) => (
                  <div
                    key={sample.name}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/20 hover:border-orange-500/50 transition-all flex flex-col"
                    onClick={() => handleSampleAnalyze(sample.name)}
                  >
                    <div className="relative h-24 w-full overflow-hidden bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${API_BASE}/content/${sample.name}`}
                        alt={sample.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-semibold text-white bg-orange-500 px-2 py-1 rounded">
                          Run YOLO Detection
                        </span>
                      </div>
                    </div>
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="font-medium text-[11px] truncate">{sample.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{sample.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Visualizer & Results Detections */}
          <div className="space-y-4">
            {analysis && analysis.annotated_url && (
              <Card className="border-border/60 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-500">Live AI Visualizer</CardTitle>
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/5 uppercase">
                    {analysis.model_used || "YOLO"} Detection Map
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="relative w-full rounded-lg overflow-hidden border border-border bg-black/40 min-h-[250px] flex items-center justify-center">
                    {analysis.is_video ? (
                      <video
                        src={`${API_BASE}${analysis.annotated_url}`}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full max-h-[400px] object-contain"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_BASE}${analysis.annotated_url}`}
                        alt="YOLO Bounding Box Detections"
                        className="w-full max-h-[400px] object-contain"
                      />
                    )}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex gap-4 w-full justify-between">
                    <span>Model: <strong className="text-foreground">{analysis.model_used || "YOLO"}</strong></span>
                    <span>Total Detections: <strong className="text-foreground">{analysis.detections.reduce((acc, d) => acc + d.count, 0)}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">Detections</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.detections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No targets detected in search zone.</p>
                ) : (
                  data.detections.map((d) => (
                    <Badge key={d.type} variant="secondary" className="capitalize">
                      {d.type.replace(/_/g, " ")} ×{d.count} ({Math.round(d.confidence * 100)}%)
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>

            {data.detections.length > 0 && (
              <SimpleBarChart
                title="Detection Confidence"
                data={data.detections.map((d) => ({
                  name: d.type.replace(/_/g, " ").slice(0, 8),
                  value: Math.round(d.confidence * 100),
                }))}
              />
            )}

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">
                  Victim Estimate: {data.victim_estimate}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground font-medium">Safe Landing Zones</p>
                  {data.safe_landing_zones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No landing zones evaluated.</p>
                  ) : (
                    data.safe_landing_zones.map((lz) => (
                      <div key={lz.name} className="text-sm">
                        {lz.name} — score {Math.round(lz.score * 100)}%
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs text-muted-foreground font-medium">Priority Areas</p>
                  {data.priority_areas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No priority areas marked.</p>
                  ) : (
                    data.priority_areas.map((a) => (
                      <div key={a.name} className="rounded-lg bg-muted/30 px-3 py-2 text-sm mt-1">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground"> — {a.reason}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
