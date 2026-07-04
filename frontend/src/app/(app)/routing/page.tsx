"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { RescueMap } from "@/components/maps/rescue-map";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Navigation, MapPin, Truck, Plane, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Obstacle {
  id: string;
  type: string;
  name: string;
  center: [number, number];
  radius: number;
  color: string;
}

export default function RoutingPage() {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [startPoint, setStartPoint] = useState<[number, number]>([34.162, -118.238]); // Base camp
  const [endPoint, setEndPoint] = useState<[number, number]>([34.148, -118.261]); // Blocked survivor W3
  const [loading, setLoading] = useState(false);
  
  // Route planning state
  const [routePlan, setRoutePlan] = useState<any>(null);

  // Fetch active obstacles on load
  const fetchObstacles = async () => {
    try {
      const data = await api.obstacles();
      setObstacles(data);
    } catch (err) {
      console.error("Failed to load obstacles:", err);
      toast.error("Failed to retrieve active hazard zones.");
    }
  };

  useEffect(() => {
    fetchObstacles();
  }, []);

  const handlePlanRoute = async () => {
    setLoading(true);
    try {
      const plan = await api.planRoute(startPoint, endPoint);
      setRoutePlan(plan);
      toast.success("Safe route computed by RescueOS AI Planner!");
    } catch (err) {
      console.error("Failed to plan route:", err);
      toast.error("Route planning algorithm encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  // Convert obstacles to Map Circles
  const obstacleCircles = obstacles.map(o => ({
    lat: o.center[0],
    lng: o.center[1],
    radius: o.radius * 111 * 1000, // degrees to meters approx
    color: o.color,
    popup: `<strong>HAZARD: ${o.name}</strong>`
  }));

  // Setup start/end markers
  const markers = [
    {
      lat: startPoint[0],
      lng: startPoint[1],
      label: "Start Point",
      color: "#a855f7",
      popup: "<strong>Command Base Camp</strong>"
    },
    {
      lat: endPoint[0],
      lng: endPoint[1],
      label: "Destination",
      color: "#ec4899",
      popup: "<strong>Survivor distress sector</strong>"
    },
    ...obstacleCircles
  ];

  // If a drone transfer point is present, mark it
  if (routePlan?.drone_required && routePlan?.drone_start_point) {
    markers.push({
      lat: routePlan.drone_start_point[0],
      lng: routePlan.drone_start_point[1],
      label: "Transfer Staging",
      color: "#06b6d4",
      popup: "<strong>Drone Staging Waypoint</strong><br/>Switch from ground to air delivery here."
    });
  }

  // Map routes
  const mapRoutes: any[] = [];
  if (routePlan) {
    // Standard direct route (Red / crossed danger)
    mapRoutes.push({
      id: "standard-route",
      name: "Standard Direct Path (CROSSES HAZARD)",
      color: "#ef4444",
      waypoints: routePlan.standard_route
    });

    if (routePlan.drone_required) {
      // Ground segment (Green)
      mapRoutes.push({
        id: "ground-route",
        name: "Staging Ground Route",
        color: "#22c55e",
        waypoints: routePlan.ground_route
      });
      // Drone segment (Cyan dotted)
      mapRoutes.push({
        id: "drone-route",
        name: "Drone Air Drop Route",
        color: "#06b6d4",
        waypoints: routePlan.drone_route
      });
    } else {
      // Safe Detoured Route (Green)
      mapRoutes.push({
        id: "safe-route",
        name: "Safe Obstacle Detour",
        color: "#22c55e",
        waypoints: routePlan.optimized_route
      });
    }
  }

  // Pre-configured targets for demo selection
  const selectPresetTarget = (id: string, name: string, coords: [number, number]) => {
    setEndPoint(coords);
    setRoutePlan(null);
    toast.info(`Target set to ${name}`);
  };

  return (
    <>
      <AppHeader title="Tactical Routing & Drone Planner" subtitle="Avoid active disaster perimeters with hybrid ground-air delivery routes" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-140px)]">
          
          {/* Controls & Metrics Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
            
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Staging & Target Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-purple-400" /> Ground Dispatch Base:</span>
                  <div className="bg-muted p-2 rounded text-xs font-mono">
                    Sector Camp 4 (34.162, -118.238)
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3 text-pink-400" /> Target Destination:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={endPoint[1] === -118.261 ? "default" : "outline"} 
                      size="sm"
                      onClick={() => selectPresetTarget("W3", "Sector W3 (Blocked)", [34.148, -118.261])}
                      className="text-xs py-1"
                    >
                      Sector W3 (Blocked)
                    </Button>
                    <Button 
                      variant={endPoint[1] === -118.237 ? "default" : "outline"} 
                      size="sm"
                      onClick={() => selectPresetTarget("W1", "Sector W1 (Detour)", [34.159, -118.237])}
                      className="text-xs py-1"
                    >
                      Sector W1 (Clearable)
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handlePlanRoute} 
                  disabled={loading} 
                  className="w-full mt-2 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Calculate Rescue Route
                </Button>
              </CardContent>
            </Card>

            {/* Active Hazard Indicators */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Active Hazard Perimeters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {obstacles.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/40">
                    <div>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
                        {o.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        Radius: {Math.round(o.radius * 111 * 1000)}m | Center: {o.center[0].toFixed(3)}, {o.center[1].toFixed(3)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider">
                      Blocked
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Route Result Panel */}
            {routePlan && (
              <Card className={`border-l-4 ${routePlan.hazard_detected ? "border-l-amber-500" : "border-l-emerald-500"} border-border/60`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    AI Routing Analysis
                    <Badge variant={routePlan.hazard_detected ? "destructive" : "default"}>
                      {routePlan.hazard_detected ? "Hazard Avoided" : "Clear Path"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                  {routePlan.hazard_detected && (
                    <div className="flex gap-2 p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <div>
                        <strong>Hazard En Route:</strong> Direct path crosses the <em>{routePlan.hazard_name}</em>. Detour calculated.
                      </div>
                    </div>
                  )}

                  {routePlan.drone_required ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-sans leading-relaxed">
                        <Plane className="h-4 w-4 shrink-0 animate-pulse" />
                        <div>
                          <strong>Hybrid Plan Triggered:</strong> Road completely blocked. Staging waypoint established outside fire perimeter. Switch to aerial delivery.
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 font-mono text-[11px] bg-black/40 p-2.5 rounded border border-border/40">
                        <div className="flex justify-between text-emerald-400">
                          <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Ground Staging Path:</span>
                          <span>Active</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground pl-4">
                          Base &rarr; Waypoint Alpha (Safe)
                        </div>
                        <div className="flex justify-between text-cyan-400 mt-2">
                          <span className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" /> Drone Airdrop Segment:</span>
                          <span>Recommend Launch</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground pl-4">
                          Waypoint Alpha &rarr; Target Sector
                        </div>
                      </div>

                      <Button size="sm" className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold tracking-wide cursor-pointer">
                        Approve Hybrid Drone Mission
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                        <Truck className="h-4 w-4 shrink-0" />
                        <div>
                          <strong>Safe Detour Route:</strong> Continuous ground delivery possible via safe bypass.
                        </div>
                      </div>
                      <div className="font-mono text-[11px] bg-black/40 p-2 rounded border border-border/40">
                        <div className="text-emerald-400">Safe Route Path:</div>
                        <div className="text-muted-foreground pl-2 leading-relaxed">
                          Base &rarr; Bypass Waypoint &rarr; Target Sector (Clear)
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Interactive Routing Map */}
          <div className="lg:col-span-2 relative h-full">
            <RescueMap markers={markers} routes={mapRoutes} height="100%" />
          </div>

        </div>
      </div>
    </>
  );
}
