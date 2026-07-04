"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/app-header";
import { api, type ResourcesData, type EvacuationPlanResponse, type WeatherData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { fetchOsrmRoute } from "@/lib/overpass";
import { ResourceDisasterMap } from "@/components/maps/resource-disaster-map";
import type { Necessity, NecessityType, DisasterType } from "@/components/maps/resource-disaster-map-inner";
import {
  Battery,
  Package,
  Users,
  Shield,
  MapPin,
  Flame,
  Waves,
  AlertTriangle,
  Zap,
  Activity,
  Play,
  Square,
  Sparkles,
  UsersRound,
  Home,
  Truck,
  Droplet,
  Map as MapIcon,
  ListFilter,
  CheckCircle2,
  Volume2,
  VolumeX,
  Navigation,
  CloudRain,
  Compass,
} from "lucide-react";

const statusColor: Record<string, string> = {
  deployed: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  en_route: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  available: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  standby: "bg-muted text-muted-foreground border border-muted-foreground/10",
  grounded: "bg-red-500/15 text-red-400 border border-red-500/20",
  adequate: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  low: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
};

const LOCATION_PRESETS = [
  { name: "Miami Beach", lat: 25.7906, lng: -80.1300, desc: "Coastal Flood Risk" },
  { name: "Los Angeles", lat: 34.152, lng: -118.243, desc: "Operations Center" },
  { name: "Tokyo Bay", lat: 35.6762, lng: 139.6503, desc: "Seismic Activity" },
  { name: "London City", lat: 51.5074, lng: -0.1278, desc: "Heavy Rain Basin" },
];

async function generateLocalNecessities(lat: number, lng: number, radiusKm: number): Promise<Necessity[]> {
  const shelterTemplates = [
    { name: "St. Jude Evacuation Shelter", qty: "Capacity: 120/300", contact: "Intake Lead (555-0192)" },
    { name: "Westside Community Gymnasium", qty: "Capacity: 85/150", contact: "Red Cross Liaison (555-0144)" },
    { name: "High School Staging Site", qty: "Capacity: 45/200", contact: "Facility Manager (555-0118)" },
  ];
  const foodTemplates = [
    { name: "Emergency Food Depot North", qty: "650 MRE packs", contact: "Sgt. Marcus (555-0291)" },
    { name: "Rescue Harvest Food Bank", qty: "1200 rations", contact: "Supply Hub (555-0238)" },
  ];
  const waterTemplates = [
    { name: "Municipal Water Reserve Staging", qty: "3200 Liters", contact: "Water Board (555-0371)" },
    { name: "Emergency Purification Station", qty: "1500 Liters", contact: "Logistics Team (555-0312)" },
  ];
  const volunteerTemplates = [
    { name: "Marcus Vance (Rescue Driver)", qty: "Vehicle: 4x4 SUV · EMT Cert", contact: "555-0481" },
    { name: "Sarah Chen (Paramedic)", qty: "Skills: Advanced Trauma Care", contact: "555-0466" },
    { name: "Elena Rostova (Incident Comms)", qty: "Skills: Multilingual Comms", contact: "555-0453" },
    { name: "Raj Patel (Supply Coordinator)", qty: "Vehicle: Pickup Truck", contact: "555-0419" },
  ];

  const generated: Necessity[] = [];

  const addItems = (templates: typeof shelterTemplates, type: NecessityType, count: number) => {
    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.2 + Math.random() * 0.8) * radiusKm;
      const dLat = (dist * Math.cos(angle)) / 111;
      const dLng = (dist * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180));

      generated.push({
        id: `${type}-${i}-${Date.now()}`,
        type,
        name: template.name,
        lat: lat + dLat,
        lng: lng + dLng,
        qty: template.qty,
        contact: template.contact,
        distanceKm: dist,
      });
    }
  };

  addItems(shelterTemplates, "shelter", 3);
  addItems(foodTemplates, "food", 2);
  addItems(waterTemplates, "water", 2);
  addItems(volunteerTemplates, "volunteer", 4);

  await Promise.allSettled(
    generated.map(async (item) => {
      const route = await fetchOsrmRoute(lat, lng, item.lat, item.lng);
      if (route) {
        item.roadDistanceKm = route.roadDistanceKm;
        item.etaMinutes = route.etaMinutes;
        item.routePolyline = route.routePolyline;
      } else {
        item.roadDistanceKm = item.distanceKm * 1.35;
        item.etaMinutes = Math.ceil((item.roadDistanceKm / 45) * 60);
        item.routePolyline = [
          [lat, lng],
          [item.lat, item.lng],
        ];
      }
    })
  );

  return generated.sort((a, b) => (a.roadDistanceKm ?? a.distanceKm) - (b.roadDistanceKm ?? b.distanceKm));
}

function ResourcesPageContent() {
  const [data, setData] = useState<ResourcesData | null>(null);
  const [activeTab, setActiveTab] = useState<"control-room" | "inventory">("control-room");

  const [disasterType, setDisasterType] = useState<DisasterType>("flood");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [impactRadius, setImpactRadius] = useState<number>(4);
  const [searchRadius, setSearchRadius] = useState<number>(10);
  const [disasterLocation, setDisasterLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 34.152,
    lng: -118.243,
  });

  // Custom coordinate inputs
  const [customLat, setCustomLat] = useState("34.152");
  const [customLng, setCustomLng] = useState("-118.243");

  const [necessities, setNecessities] = useState<Necessity[]>([]);
  const [loadingNecessities, setLoadingNecessities] = useState(false);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [aiPlan, setAiPlan] = useState<EvacuationPlanResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simStats, setSimStats] = useState({
    evacuated: 0,
    waterDelivered: 0,
    foodDelivered: 0,
    volunteersActive: 0,
  });

  // Manual Dispatch state: Set of necessity IDs
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  // Speech synthesizer active state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    api.resources().then(setData).catch(() => {});
  }, []);

  const refreshNecessities = useCallback(async (lat: number, lng: number, rad: number) => {
    setLoadingNecessities(true);
    setLoadingWeather(true);
    try {
      // 1. Fetch routes and generate necessaries
      const items = await generateLocalNecessities(lat, lng, rad);
      setNecessities(items);

      // 2. Fetch real-world weather metrics
      const weatherData = await api.weather(lat, lng);
      setWeather(weatherData);

      setAiPlan(null);
      setIsSimulating(false);
      setDispatchedIds(new Set());
      setSimStats({ evacuated: 0, waterDelivered: 0, foodDelivered: 0, volunteersActive: 0 });
    } catch {
      toast.error("Failed to retrieve routing or weather services.");
    } finally {
      setLoadingNecessities(false);
      setLoadingWeather(false);
    }
  }, []);

  // Fetch initial location metrics on mount
  useEffect(() => {
    if (disasterLocation) {
      refreshNecessities(disasterLocation.lat, disasterLocation.lng, searchRadius);
    }
  }, []);

  // Terminate audio speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setDisasterLocation({ lat, lng });
    setCustomLat(lat.toFixed(4));
    setCustomLng(lng.toFixed(4));
    refreshNecessities(lat, lng, searchRadius);
    toast.success(`Epicenter relocated to: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handleTeleportInput = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid decimal coordinates.");
      return;
    }
    setDisasterLocation({ lat, lng });
    refreshNecessities(lat, lng, searchRadius);
    toast.success(`Map centered on custom coordinate: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handlePresetSelect = (preset: typeof LOCATION_PRESETS[0]) => {
    setDisasterLocation({ lat: preset.lat, lng: preset.lng });
    setCustomLat(preset.lat.toString());
    setCustomLng(preset.lng.toString());
    refreshNecessities(preset.lat, preset.lng, searchRadius);
    toast.success(`Teleported Operations to: ${preset.name}`);
  };

  const handleGenerateAIPlan = async () => {
    if (!disasterLocation) {
      toast.error("Mark the hazard location on the map first.");
      return;
    }
    setAiLoading(true);
    try {
      const requestData = {
        disaster_type: disasterType,
        latitude: disasterLocation.lat,
        longitude: disasterLocation.lng,
        severity,
        impact_radius_km: impactRadius,
        resources: necessities.map((n) => ({
          name: n.name,
          type: n.type,
          roadDistanceKm: n.roadDistanceKm,
          etaMinutes: n.etaMinutes,
          qty: n.qty,
        })),
      };

      const plan = await api.evacuationPlan(requestData);
      setAiPlan(plan);
      toast.success("AI Evacuation Plan compiled!");
    } catch {
      toast.error("Failed to connect to backend AI services.");
    } finally {
      setAiLoading(false);
    }
  };

  // Text-To-Speech audio vocal alert broadcast
  const handleVocalBroadcast = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Speech Synthesis is not supported in this browser.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      toast.info("Voice broadcast transmission canceled.");
      return;
    }

    if (!aiPlan) {
      toast.error("Please generate an action plan first before broadcasting.");
      return;
    }

    const announceText = `Attention all emergency units and local residents. A high-priority ${severity} severity ${disasterType} incident has occurred. The AI Operations Coordinator outlines the following instructions: ${aiPlan.summary}. Risk assessment indicates that ${aiPlan.risk_assessment}. Nearest safe shelters include: ${necessities
      .filter((n) => n.type === "shelter")
      .map((n) => n.name)
      .join(", ")}. Please follow marked road coordinates. Dispatch teams are en route.`;

    const utterance = new SpeechSynthesisUtterance(announceText);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
    toast.success("Broadcasting voice alerts to local radio frequencies...");
  };

  const handleManualDispatchToggle = (id: string) => {
    setDispatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Resource recalled to staging standby.");
      } else {
        next.add(id);
        const item = necessities.find((n) => n.id === id);
        toast.success(`Dispatched ${item?.name ?? "Resource"}! Route path active.`);
      }
      return next;
    });
  };

  const handleSimulationTick = (progress: number) => {
    setSimProgress(progress);
    setSimStats({
      evacuated: Math.min(Math.round(progress * 180), 180),
      waterDelivered: Math.min(Math.round(progress * 2500), 2500),
      foodDelivered: Math.min(Math.round(progress * 480), 480),
      volunteersActive: Math.min(Math.round(progress * 8), 8),
    });
  };

  const renderOriginalInventory = () => {
    if (!data) return <div className="text-muted-foreground">Loading resources...</div>;
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/60 bg-muted/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <Users className="h-4 w-4 text-emerald-400" /> Rescue Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-900/50 border border-border/20 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.location} · {t.members} members</p>
                </div>
                <Badge className={statusColor[t.status]}>{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <Battery className="h-4 w-4 text-orange-400 animate-pulse" /> Drones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.drones.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl bg-slate-900/50 border border-border/20 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.location ?? d.reason} · {d.battery_pct}% battery
                  </p>
                </div>
                <Badge className={statusColor[d.status]}>{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <Package className="h-4 w-4 text-cyan-400" /> Supplies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.supplies.map((s) => (
              <div key={s.item} className="flex items-center justify-between rounded-xl bg-slate-900/50 border border-border/20 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{s.item}</p>
                  <p className="text-xs text-muted-foreground">Qty: {s.qty}</p>
                </div>
                <Badge className={statusColor[s.status]}>{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <AppHeader
        title="Disaster & Resource Management"
        subtitle="Evacuation routes, active incident mapping & AI operations coordinator"
      />
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* Dual Mode Switcher */}
        <div className="flex justify-between items-center bg-muted/20 border border-border/50 p-2 rounded-2xl backdrop-blur-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("control-room")}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === "control-room"
                  ? "bg-slate-800 text-slate-100 shadow-xl border border-slate-700/60"
                  : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> Disaster Control Room
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeTab === "inventory"
                  ? "bg-slate-800 text-slate-100 shadow-xl border border-slate-700/60"
                  : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" /> Inventory Registry
            </button>
          </div>
          {activeTab === "control-room" && (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-wider py-1 px-3">
              🔴 Live Tactical Feed
            </Badge>
          )}
        </div>

        {activeTab === "inventory" ? (
          renderOriginalInventory()
        ) : (
          <div className="grid gap-5 xl:grid-cols-4">
            {/* Left Column: Configuration Panels */}
            <div className="xl:col-span-1 space-y-4">
              {/* Disaster Configurator Card */}
              <Card className="border-border/60 bg-muted/10 backdrop-blur-sm shadow-xl">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="flex items-center gap-2 text-sm text-slate-100 font-semibold uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-orange-400" /> 1. Incident Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-slate-200">
                  {/* Select Preset Locations */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Compass className="h-3 w-3 text-cyan-400" /> Teleport Presets
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LOCATION_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => handlePresetSelect(preset)}
                          className="flex flex-col items-start px-2.5 py-1.5 rounded-xl border border-border/30 bg-slate-900/30 hover:border-cyan-500/50 hover:bg-slate-900/50 text-left transition-all duration-200"
                        >
                          <span className="text-[11px] font-bold text-slate-200">{preset.name}</span>
                          <span className="text-[9px] text-muted-foreground">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Disaster */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Select Disaster Type
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { type: "flood", emoji: "🌊", label: "Flood" },
                        { type: "wildfire", emoji: "🔥", label: "Fire" },
                        { type: "earthquake", emoji: "🌋", label: "Quake" },
                        { type: "hurricane", emoji: "🌀", label: "Wind" },
                        { type: "chemical", emoji: "⚠️", label: "Spill" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          onClick={() => setDisasterType(item.type as DisasterType)}
                          title={item.label}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 ${
                            disasterType === item.type
                              ? "bg-slate-800 border-slate-500 text-slate-100 scale-105 shadow-md"
                              : "bg-slate-900/30 border-border/30 hover:border-border/60 text-slate-400"
                          }`}
                        >
                          <span className="text-base">{item.emoji}</span>
                          <span className="text-[9px] mt-1 font-semibold">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Incident Severity */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Incident Severity
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["low", "medium", "high", "critical"] as const).map((level) => {
                        const styleMap = {
                          low: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
                          medium: "border-yellow-500/20 text-yellow-400 bg-yellow-500/5",
                          high: "border-orange-500/20 text-orange-400 bg-orange-500/5",
                          critical: "border-red-500/20 text-red-400 bg-red-500/5",
                        };
                        const activeStyleMap = {
                          low: "border-emerald-500 text-emerald-100 bg-emerald-950/60 shadow-emerald-500/20",
                          medium: "border-yellow-500 text-yellow-100 bg-yellow-950/60 shadow-yellow-500/20",
                          high: "border-orange-500 text-orange-100 bg-orange-950/60 shadow-orange-500/20",
                          critical: "border-red-500 text-red-100 bg-red-950/60 shadow-red-500/20",
                        };

                        return (
                          <button
                            key={level}
                            onClick={() => setSeverity(level)}
                            className={`py-1.5 text-[10px] font-bold uppercase rounded-xl border transition-all duration-200 ${
                              severity === level ? activeStyleMap[level] + " shadow-md" : styleMap[level]
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Impact Radius Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Danger Perimeter</span>
                      <span className="text-slate-200 lowercase font-mono">{impactRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={impactRadius}
                      onChange={(e) => setImpactRadius(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Search Radius Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Resource Search Radius</span>
                      <span className="text-slate-200 lowercase font-mono">{searchRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={searchRadius}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSearchRadius(val);
                        if (disasterLocation) {
                          refreshNecessities(disasterLocation.lat, disasterLocation.lng, val);
                        }
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Custom Geolocation Search */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Custom Location finder
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Lat"
                        value={customLat}
                        onChange={(e) => setCustomLat(e.target.value)}
                        className="w-1/2 bg-slate-900/50 border border-border/40 p-2 rounded-xl text-xs font-mono text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="Lng"
                        value={customLng}
                        onChange={(e) => setCustomLng(e.target.value)}
                        className="w-1/2 bg-slate-900/50 border border-border/40 p-2 rounded-xl text-xs font-mono text-slate-100"
                      />
                      <Button
                        onClick={handleTeleportInput}
                        size="sm"
                        className="rounded-xl px-3"
                        style={{ background: "#06b6d4", color: "white" }}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Location Coordinate Indicators */}
                  <div className="bg-slate-950/50 border border-border/20 rounded-xl p-3 text-xs space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5">
                      Epicenter Location
                    </p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-red-400" />
                      {disasterLocation ? (
                        <span className="font-mono text-slate-300">
                          {disasterLocation.lat.toFixed(5)}°N, {disasterLocation.lng.toFixed(5)}°W
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">No location selected</span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground italic pt-1 border-t border-border/10 mt-1">
                      💡 Click directly on the map to re-center the incident.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Simulation Controls Panel */}
              <Card className="border-border/60 bg-muted/10 backdrop-blur-sm shadow-xl">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="flex items-center gap-2 text-sm text-slate-100 font-semibold uppercase tracking-wider">
                    <Activity className="h-4 w-4 text-emerald-400" /> 2. Evacuation Simulator
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={isSimulating ? "destructive" : "default"}
                      onClick={() => setIsSimulating(!isSimulating)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-5"
                      style={!isSimulating ? {
                        background: "linear-gradient(135deg, oklch(0.72 0.18 44), oklch(0.65 0.18 44))",
                        color: "black",
                        fontWeight: "700",
                      } : {}}
                    >
                      {isSimulating ? (
                        <>
                          <Square className="h-4 w-4" /> Stop Simulation
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Run Simulation
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Simulation Indicators */}
                  {isSimulating && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                        <span>Simulation Time Flow</span>
                        <span>{Math.round(simProgress * 100)}%</span>
                      </div>
                      <Progress value={simProgress * 100} className="h-1.5 bg-slate-800" />
                    </div>
                  )}

                  {/* Live Simulation Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/40 border border-border/10 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Evacuated
                      </span>
                      <span className="font-mono text-lg font-bold text-emerald-400">
                        {simStats.evacuated} <span className="text-[10px] text-muted-foreground font-normal">pts</span>
                      </span>
                    </div>
                    <div className="bg-slate-900/40 border border-border/10 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Water Dispatched
                      </span>
                      <span className="font-mono text-lg font-bold text-cyan-400">
                        {simStats.waterDelivered} <span className="text-[10px] text-muted-foreground font-normal">L</span>
                      </span>
                    </div>
                    <div className="bg-slate-900/40 border border-border/10 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Food Transported
                      </span>
                      <span className="font-mono text-lg font-bold text-amber-400">
                        {simStats.foodDelivered} <span className="text-[10px] text-muted-foreground font-normal">MRE</span>
                      </span>
                    </div>
                    <div className="bg-slate-900/40 border border-border/10 rounded-xl p-2.5 text-center">
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Volunteers Active
                      </span>
                      <span className="font-mono text-lg font-bold text-red-400">
                        {simStats.volunteersActive} <span className="text-[10px] text-muted-foreground font-normal">hc</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center & Right Column: Map area and AI tactics panel */}
            <div className="xl:col-span-3 space-y-4">
              {/* Map Component Container */}
              <div className="relative h-[480px] w-full rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                <ResourceDisasterMap
                  disasterType={disasterType}
                  disasterLocation={disasterLocation}
                  impactRadiusKm={impactRadius}
                  necessities={necessities}
                  isSimulating={isSimulating}
                  dispatchedIds={Array.from(dispatchedIds)}
                  onMapClick={handleMapClick}
                  onSimulationTick={handleSimulationTick}
                />

                {/* Weather Overlay Dashboard Widget */}
                {weather && (
                  <div className="absolute top-4 right-4 bg-slate-950/85 border border-slate-700/80 p-3 rounded-2xl z-[999] backdrop-blur-md max-w-[210px] text-slate-200 shadow-2xl space-y-2 animate-fade-in">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 border-b border-slate-800 pb-1.5">
                      <CloudRain className="h-3 w-3 text-cyan-400" /> METAR / Local Weather
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temp:</span>
                        <span className="font-semibold">{weather.temp_c}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wind Speed:</span>
                        <span className="font-semibold">{weather.wind_speed_ms} m/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conditions:</span>
                        <span className="font-semibold capitalize text-slate-300">{weather.conditions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flood Risk:</span>
                        <Badge className={`text-[8px] px-1.5 py-0 ${weather.flood_risk === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                          {weather.flood_risk}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-cyan-400/90 font-medium italic border-t border-slate-800/80 pt-1.5 mt-1 leading-normal">
                        {weather.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Map Overlay Loader */}
                {loadingNecessities && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center text-slate-100 gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
                    <p className="text-xs font-semibold tracking-wider text-slate-300">
                      Calculating OSRM shortest road paths...
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom: AI Tactics Panel & Facilities Directory */}
              <div className="grid gap-5 lg:grid-cols-3">
                {/* AI Coordinator */}
                <Card className="lg:col-span-2 border-border/60 bg-muted/10 backdrop-blur-sm shadow-xl flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/40 flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-sm text-slate-100 font-semibold uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" /> AI Evacuation Coordinator
                    </CardTitle>
                    <div className="flex gap-2">
                      {aiPlan && (
                        <Button
                          onClick={handleVocalBroadcast}
                          size="sm"
                          className="flex items-center gap-1.5 rounded-lg text-xs"
                          style={{
                            background: isPlayingAudio ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #f97316, #ea580c)",
                            color: "white",
                            fontWeight: "600",
                          }}
                        >
                          {isPlayingAudio ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5" /> Stop Alert Broadcast
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" /> Vocal Broadcast
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={handleGenerateAIPlan}
                        disabled={aiLoading || !disasterLocation}
                        size="sm"
                        className="flex items-center gap-1.5 rounded-lg text-xs animate-shimmer"
                        style={{
                          background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {aiLoading ? (
                          <>Analyzing...</>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" /> Generate Action Plan
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 text-slate-200">
                    {aiPlan ? (
                      <div className="space-y-4 animate-fade-in">
                        {/* Summary & Risk */}
                        <div className="grid md:grid-cols-2 gap-3 bg-slate-950/40 border border-border/20 rounded-xl p-3">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                              Tactical Summary
                            </span>
                            <p className="text-xs leading-relaxed text-slate-300">{aiPlan.summary}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                              Risk Assessment
                            </span>
                            <p className="text-xs leading-relaxed text-slate-300">{aiPlan.risk_assessment}</p>
                          </div>
                        </div>

                        {/* Priority Actions */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                            Priority Dispatch Steps
                          </span>
                          <div className="grid md:grid-cols-3 gap-2">
                            {aiPlan.priority_actions?.map((act) => (
                              <div
                                key={act.priority}
                                className="bg-slate-900/60 border border-border/10 rounded-xl p-3 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="flex items-center justify-center h-4.5 w-4.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[10px] font-bold">
                                      P{act.priority}
                                    </span>
                                    <Badge className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5">
                                      {act.resource}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-snug">{act.action}</p>
                                </div>
                                <div className="text-[10px] text-emerald-400 font-semibold font-mono mt-2.5">
                                  ⏱️ Est. ETA: {act.eta_minutes} min
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Volunteer Tasks & Supplies */}
                        <div className="grid md:grid-cols-2 gap-4 border-t border-border/15 pt-4">
                          {/* Volunteer assignments */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              Volunteer Deployments
                            </span>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                              {aiPlan.volunteer_assignments?.map((vol, index) => (
                                <div
                                  key={index}
                                  className="bg-slate-900/40 border border-border/10 rounded-lg p-2.5 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-200">{vol.volunteer_name}</span>
                                    <span className="block text-[10px] text-muted-foreground">{vol.task}</span>
                                  </div>
                                  <Badge className="bg-red-500/5 text-red-400 border border-red-500/10 text-[9px]">
                                    📍 {vol.location}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Supply flow */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              Resource Distribution Flow
                            </span>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                              {aiPlan.supply_distribution?.map((flow, index) => (
                                <div
                                  key={index}
                                  className="bg-slate-900/40 border border-border/10 rounded-lg p-2.5 flex flex-col justify-between text-xs"
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-slate-300 font-medium truncate max-w-[100px]">{flow.source}</span>
                                    <span className="text-muted-foreground text-[10px]">➡️</span>
                                    <span className="text-slate-300 font-medium truncate max-w-[100px]">{flow.destination}</span>
                                  </div>
                                  <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                                    📦 {flow.supplies}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-[180px] border border-dashed border-border/30 rounded-xl flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                        <Sparkles className="h-7 w-7 text-muted-foreground/45 mb-2" />
                        <p className="text-xs font-semibold text-slate-400">Tactical AI Copilot Standby</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-normal">
                          Declare a disaster and click "Generate Action Plan" to request tactical evacuation routes and logistics coordination.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Nearest Necessaries list */}
                <Card className="border-border/60 bg-muted/10 backdrop-blur-sm shadow-xl flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="flex items-center gap-2 text-sm text-slate-100 font-semibold uppercase tracking-wider">
                      <ListFilter className="h-4 w-4 text-cyan-400" /> Nearest Necessaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 overflow-y-auto max-h-[380px] space-y-2.5">
                    {necessities.length > 0 ? (
                      necessities.map((n) => {
                        const iconMap = {
                          shelter: <Home className="h-3.5 w-3.5 text-emerald-400" />,
                          food: <Package className="h-3.5 w-3.5 text-amber-400" />,
                          water: <Droplet className="h-3.5 w-3.5 text-cyan-400" />,
                          volunteer: <UsersRound className="h-3.5 w-3.5 text-rose-400" />,
                        };
                        const borderStyle = {
                          shelter: "hover:border-emerald-500/30 border-emerald-500/10 bg-emerald-500/2",
                          food: "hover:border-amber-500/30 border-amber-500/10 bg-amber-500/2",
                          water: "hover:border-cyan-500/30 border-cyan-500/10 bg-cyan-500/2",
                          volunteer: "hover:border-rose-500/30 border-rose-500/10 bg-rose-500/2",
                        };

                        const isDispatched = dispatchedIds.has(n.id);

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleManualDispatchToggle(n.id)}
                            className={`p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer ${
                              isDispatched
                                ? "border-emerald-400 shadow-md bg-emerald-500/10"
                                : borderStyle[n.type]
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {iconMap[n.type]}
                                <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                                  {n.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {n.roadDistanceKm ? `${n.roadDistanceKm.toFixed(1)} km` : `${n.distanceKm.toFixed(1)} km`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/10 pt-1.5 mt-0.5">
                              <span>{n.qty ?? "Status: Standby"}</span>
                              <div className="flex items-center gap-1.5">
                                {isDispatched ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] animate-pulse">
                                    EN ROUTE
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px]">
                                    STANDBY
                                  </Badge>
                                )}
                                {n.etaMinutes ? (
                                  <span className="text-emerald-400 font-bold font-mono">🚗 {n.etaMinutes}m ETA</span>
                                ) : (
                                  <span className="text-muted-foreground">No Road Link</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-muted-foreground italic text-center py-6">
                        No facilities or resources found within search radius.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const ResourcesPage = dynamic(() => Promise.resolve(ResourcesPageContent), {
  ssr: false,
});

export default ResourcesPage;
