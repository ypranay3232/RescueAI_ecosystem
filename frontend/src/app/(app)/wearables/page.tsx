"use client";

import { useState, useEffect, useRef } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { RescueMap } from "@/components/maps/rescue-map";
import { SurvivorCard } from "@/components/wearables/survivor-card";
import { useSurvivorWebSocket } from "@/hooks/use-survivor-websocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, AlertCircle, Users, Activity, Heart, ShieldAlert, Terminal, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SurvivorData } from "@/hooks/use-survivor-websocket";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DroneRoute } from "@/lib/mock-data";

interface ActiveDispatch {
  survivorId: string;
  survivorName: string;
  vitalsSummary: string;
  triggeredAt: string;
  status: "detecting" | "analyzing" | "drone" | "ground" | "completed" | "cancelled";
  logs: string[];
}

export default function WearablesPage() {
  const { survivors, isConnected, lastUpdate, error, triggerPanic } = useSurvivorWebSocket();
  const [activeDispatches, setActiveDispatches] = useState<ActiveDispatch[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<DroneRoute[]>([]);
  const activeDispatchesRef = useRef<Record<string, boolean>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout[]>>({});

  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn("AudioContext failed to initialize:", e);
    }
  };

  const startAutoDispatch = (s: SurvivorData) => {
    const id = s.id;
    if (activeDispatchesRef.current[id]) return;
    activeDispatchesRef.current[id] = true;

    // Play critical alert audio ping
    playAlertSound();

    toast.warning(`ALERT: Survivor ${s.name} is in critical condition! Auto-dispatching assets...`, {
      duration: 5000,
    });

    const newDispatch: ActiveDispatch = {
      survivorId: s.id,
      survivorName: s.name,
      vitalsSummary: `HR: ${s.vitals.heart_rate} bpm | SpO2: ${s.vitals.oxygen_saturation}% | Temp: ${s.vitals.temperature}°C`,
      triggeredAt: new Date().toLocaleTimeString(),
      status: "detecting",
      logs: ["Critical telemetry detected.", "Initiating automated emergency response protocol..."],
    };

    setActiveDispatches((prev) => [...prev, newDispatch]);
    timeoutsRef.current[id] = [];

    // Step 1: AI routing calculation & Weather safety check (1.5s)
    const t1 = setTimeout(async () => {
      let weatherWarning = "";
      let isFlightUnsafe = false;

      try {
        const weather = await api.weather(s.lat, s.lng);
        if (!weather.flight_safe || weather.wind_speed_ms > 10.0) {
          isFlightUnsafe = true;
          weatherWarning = `⚠️ WEATHER WARNING: Unsafe flight conditions (${weather.wind_speed_ms.toFixed(1)} m/s). ${weather.recommendation}`;
        }
      } catch (err) {
        console.error("Failed to query weather API:", err);
      }

      setActiveDispatches((prev) =>
        prev.map((d) => {
          if (d.survivorId !== id) return d;
          const logs = [
            ...d.logs,
            "AI Planner: Analyzing optimal responders and weather telemetry.",
          ];

          if (weatherWarning) {
            logs.push(weatherWarning);
            logs.push("AI Plan Alteration: Ground Team Bravo stage immediately. Delay Drone 3 launch.");
          } else {
            logs.push("AI analysis: All systems green. Selected Drone 3 and Rescue Team Bravo.");
          }

          return {
            ...d,
            status: "analyzing",
            logs,
          };
        })
      );

      const isUnsafe = isFlightUnsafe;

      // Step 2: Dispatch Drone (3s)
      const t2 = setTimeout(async () => {
        if (isUnsafe) {
          setActiveDispatches((prev) =>
            prev.map((d) =>
              d.survivorId === id
                ? {
                    ...d,
                    status: "drone",
                    logs: [
                      ...d.logs,
                      "Drone 3: Safety trigger. Drone launch stands by (wind limit exceeded).",
                      "Monitoring wind speed for clearing window...",
                    ],
                  }
                : d
            )
          );
        } else {
          try {
            await api.dispatchResource({
              resource_id: "D3",
              resource_type: "drones",
              status: "active",
              location: `Survivor Sector (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`,
            });

            // Draw route line on the Leaflet map in hot pink
            setActiveRoutes((prev) => [
              ...prev,
              {
                id: `route-${id}`,
                name: `Drone 3 path to ${s.name}`,
                color: "#ec4899",
                waypoints: [
                  [34.162, -118.238], // Base camp coordinates
                  [s.lat, s.lng],
                ],
              },
            ]);
          } catch (err) {
            console.error("Drone dispatch failed:", err);
          }

          setActiveDispatches((prev) =>
            prev.map((d) =>
              d.survivorId === id
                ? {
                    ...d,
                    status: "drone",
                    logs: [
                      ...d.logs,
                      "AI Action: Sending dispatch command to Drone 3 (Base Camp).",
                      `Drone 3 state updated to ACTIVE. Flight path route drawn to [${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}].`,
                    ],
                  }
                : d
            )
          );
        }
      }, 1500);
      timeoutsRef.current[id].push(t2);

      // Step 3: Dispatch Ground Team (4.5s)
      const t3 = setTimeout(async () => {
        try {
          await api.dispatchResource({
            resource_id: "T2",
            resource_type: "teams",
            status: "deployed",
            location: `Staging Area (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`,
          });
        } catch (err) {
          console.error("Ground team dispatch failed:", err);
        }

        setActiveDispatches((prev) =>
          prev.map((d) =>
            d.survivorId === id
              ? {
                  ...d,
                  status: "ground",
                  logs: [
                    ...d.logs,
                    "AI Action: Sending dispatch command to Rescue Team Bravo.",
                    "Rescue Team Bravo state updated to DEPLOYED. Vehicle ETA: 8 min.",
                  ],
                }
              : d
          )
        );
      }, 3000);
      timeoutsRef.current[id].push(t3);

      // Step 4: Completed (6s)
      const t4 = setTimeout(() => {
        setActiveDispatches((prev) =>
          prev.map((d) =>
            d.survivorId === id
              ? {
                  ...d,
                  status: "completed",
                  logs: [
                    ...d.logs,
                    isUnsafe
                      ? "Dispatch sequence finalized. Ground Bravo units deployed; Drone 3 grounded pending safety clearance."
                      : "Dispatch sequence successfully established. All assets en route.",
                  ],
                }
              : d
          )
        );
        toast.success(`Success: Emergency assets successfully routed to ${s.name}!`);
      }, 4500);
      timeoutsRef.current[id].push(t4);

    }, 1500);
    timeoutsRef.current[id].push(t1);
  };

  const cancelDispatch = async (survivorId: string) => {
    if (timeoutsRef.current[survivorId]) {
      timeoutsRef.current[survivorId].forEach(clearTimeout);
      delete timeoutsRef.current[survivorId];
    }

    try {
      await api.resetResources();
      toast.info("Emergency dispatch cancelled. Resources recalled.");
    } catch (err) {
      console.error("Failed to recall resources:", err);
    }

    // Clear route from map
    setActiveRoutes((prev) => prev.filter((r) => r.id !== `route-${survivorId}`));

    setActiveDispatches((prev) =>
      prev.map((d) =>
        d.survivorId === survivorId
          ? {
              ...d,
              status: "cancelled",
              logs: [...d.logs, "Dispatch TERMINATED by operator override.", "All assets recalled to Base Camp."],
            }
          : d
      )
    );
  };

  const handleResetSimulation = async () => {
    Object.values(timeoutsRef.current).forEach((list) => list.forEach(clearTimeout));
    timeoutsRef.current = {};
    activeDispatchesRef.current = {};
    
    try {
      await api.resetResources();
      toast.success("Simulation environment reset successfully!");
    } catch (err) {
      toast.error("Failed to reset resources state.");
    }
    
    setActiveDispatches([]);
    setActiveRoutes([]);
  };

  useEffect(() => {
    survivors.forEach((s) => {
      if (s.status === "red") {
        startAutoDispatch(s);
      }
    });
  }, [survivors]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach((list) => list.forEach(clearTimeout));
    };
  }, []);

  const handlePanicTrigger = async (survivorId: string) => {
    try {
      await triggerPanic(survivorId);
    } catch (err) {
      console.error("Failed to trigger panic:", err);
    }
  };

  // Convert survivor data to map format
  const mapSurvivors = survivors.map(s => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    heartRate: s.vitals.heart_rate,
    temperature: s.vitals.temperature,
    movement: s.activity.level,
    status: s.status,
    lastUpdate: new Date(s.last_update).toLocaleTimeString(),
  }));

  // Calculate summary stats
  const totalSurvivors = survivors.length;
  const criticalCount = survivors.filter(s => s.status === "red").length;
  const warningCount = survivors.filter(s => s.status === "yellow").length;
  const safeCount = survivors.filter(s => s.status === "green").length;
  const avgHeartRate = Math.round(survivors.reduce((sum, s) => sum + s.vitals.heart_rate, 0) / totalSurvivors) || 0;

  return (
    <>
      <AppHeader title="Survivor Wearables" subtitle="Real-time GPS & comprehensive vitals monitoring" />
      <div className="flex-1 overflow-auto p-6">
        {/* Connection Status Bar */}
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${isConnected ? "text-emerald-500" : "text-red-500"}`}>
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isConnected ? "Live Connected" : "Disconnected"}
              </span>
            </div>
            {lastUpdate && (
              <div className="text-sm text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(activeDispatches.length > 0 || activeRoutes.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSimulation}
                className="text-xs gap-1 border-muted hover:bg-muted cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Simulation
              </Button>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalSurvivors}</div>
                <div className="text-xs text-muted-foreground">Total Survivors</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                <Activity className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
                <div className="text-xs text-muted-foreground">Attention</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <Heart className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-500">{avgHeartRate}</div>
                <div className="text-xs text-muted-foreground">Avg Heart Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Survivor Status</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Updates
              </div>
            </div>
            {survivors.map((survivor) => (
              <SurvivorCard
                key={survivor.id}
                survivor={survivor}
                onPanicTrigger={handlePanicTrigger}
              />
            ))}
          </div>
          <div className="lg:col-span-2 space-y-6">
            {/* Auto-Dispatch Monitor Panel */}
            {activeDispatches.length > 0 && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-red-500/20">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                    <CardTitle className="text-sm font-bold text-red-500 uppercase tracking-wider">
                      AI Auto-Dispatch Control Center
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleResetSimulation}
                    className="text-xs gap-1 border-red-500/20 hover:bg-red-500/20 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Simulation
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {activeDispatches.map((dispatch) => {
                    const getProgressValue = (status: string) => {
                      switch (status) {
                        case "detecting": return 15;
                        case "analyzing": return 40;
                        case "drone": return 65;
                        case "ground": return 85;
                        case "completed": return 100;
                        case "cancelled": return 0;
                        default: return 0;
                      }
                    };

                    const getStatusBadgeColor = (status: string) => {
                      switch (status) {
                        case "detecting": return "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse";
                        case "analyzing": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        case "drone": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        case "ground": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                        case "completed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        case "cancelled": return "bg-muted text-muted-foreground border-border";
                        default: return "bg-muted text-muted-foreground";
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case "detecting": return "Detecting vitals drop";
                        case "analyzing": return "AI planning optimal path";
                        case "drone": return "Deploying Drone 3";
                        case "ground": return "Staging Ground Team Bravo";
                        case "completed": return "Dispatch completed";
                        case "cancelled": return "Operator override";
                        default: return status;
                      }
                    };

                    return (
                      <div key={dispatch.survivorId} className="border border-border/40 rounded-lg p-3 bg-card/60 space-y-3 font-sans">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Activity className="h-4 w-4 text-red-500" />
                              Distress Route: {dispatch.survivorName}
                            </h4>
                            <p className="text-xs text-muted-foreground">{dispatch.vitalsSummary}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusBadgeColor(dispatch.status)} border capitalize font-mono text-[10px]`}>
                              {getStatusText(dispatch.status)}
                            </Badge>
                            {dispatch.status !== "completed" && dispatch.status !== "cancelled" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs px-2.5 cursor-pointer"
                                onClick={() => cancelDispatch(dispatch.survivorId)}
                              >
                                Override
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ease-out ${
                                dispatch.status === "cancelled" ? "bg-muted" :
                                dispatch.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                              style={{ width: `${getProgressValue(dispatch.status)}%` }}
                            />
                          </div>
                        </div>

                        {/* Terminal logs */}
                        <div className="rounded-lg bg-black/60 p-2 text-[11px] font-mono text-muted-foreground space-y-1 max-h-24 overflow-y-auto border border-border/20">
                          <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 mb-1 text-red-400/80 font-bold">
                            <Terminal className="h-3.5 w-3.5" />
                            <span>AI DISPATCH TELEMETRY LOG</span>
                          </div>
                          {dispatch.logs.map((log, i) => (
                            <div key={i} className="leading-relaxed">
                              <span className="text-emerald-500/80">&gt;</span> {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Live Survivor Locations</CardTitle>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? "Live Tracking" : "Offline"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <RescueMap survivors={mapSurvivors} routes={activeRoutes} height="600px" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
