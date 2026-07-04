"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bot, Send, AlertTriangle, Shield, Heart, MapPin, 
  Package, CheckCircle2, Loader2, Sparkles, Plus, Check
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useSurvivorWebSocket, SurvivorData } from "@/hooks/use-survivor-websocket";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "plan_form" | "plan_display" | "sos_panel" | "dispatch_panel" | "supplies_panel";
  planData?: {
    aircraftType?: string;
    peopleOnboard?: number;
    terrain?: string;
    weather?: string;
    lat?: number;
    lng?: number;
    summary: string;
    riskAssessment: string;
    planType: "wildfire" | "flood" | "aircraft" | "wearables" | "drones" | "general";
  };
}

export function FloatingChat() {
  const { survivors, isConnected } = useSurvivorWebSocket();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "RescueOS AI Command Assistant online. I am synced with your dashboard environment. Ask me to generate a tactical plan matching your active screen, or ask a question.",
      type: "text"
    }
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Staged Response Steps State
  const [servicesAlerted, setServicesAlerted] = useState<Record<string, "idle" | "transmitting" | "alerted">>({
    Police: "idle",
    Hospital: "idle",
    FireStation: "idle"
  });
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "routing" | "dispatched">("idle");
  const [suppliesStatus, setSuppliesStatus] = useState<"idle" | "loading" | "delivered">("idle");

  const [activePlanParams, setActivePlanParams] = useState({
    aircraftType: "Commercial Passenger Jet",
    peopleOnboard: 65,
    terrain: "Dense Mountainous Forest",
    weather: "Thunderstorm with 20m/s winds",
    lat: 34.152,
    lng: -118.243
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, open]);

  // Sync initial welcome message or help context if user navigates to a new tab
  useEffect(() => {
    let tabName = "Command Center Dashboard";
    if (pathname === "/search") tabName = "Aircraft Flight Tracker";
    if (pathname === "/drones") tabName = "Drone Intel footage analysis";
    if (pathname === "/wearables") tabName = "Survivor Wearables vitals telemetry";
    if (pathname === "/resources") tabName = "Rescue Assets Inventory";
    
    toast.info(`AI Assistant synced with: ${tabName}`);
  }, [pathname]);

  const addMessage = (role: "user" | "assistant", content: string, type: ChatMessage["type"] = "text", planData?: ChatMessage["planData"]) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      type,
      planData
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    addMessage("user", userText);

    const lower = userText.toLowerCase();

    // Check for specific plan requests
    if (lower.includes("generate plan") || lower.includes("new plan") || lower.includes("crash plan") || lower.includes("create plan")) {
      handleContextualPlanRequest();
      return;
    }

    // Check for alerts
    if (lower.includes("alert services") || lower.includes("send sos")) {
      addMessage("assistant", "Opening services alert panel to coordinate local responders:", "sos_panel");
      return;
    }

    // Check for dispatch
    if (lower.includes("route") || lower.includes("dispatch")) {
      addMessage("assistant", "Opening wearable responder tracking panel for GPS routing:", "dispatch_panel");
      return;
    }

    // Check for supplies
    if (lower.includes("supply") || lower.includes("drone") || lower.includes("airdrop")) {
      addMessage("assistant", "Opening cargo allocation calculator for drone dispatch:", "supplies_panel");
      return;
    }

    // General fallback calling backend
    setLoading(true);
    try {
      // Call /api/ai/chat
      const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          context: `Current pathname URL: ${pathname}. Active survivors count: ${survivors.length}. Staged alert status: Police (${servicesAlerted.Police}), Hospital (${servicesAlerted.Hospital}), FireStation (${servicesAlerted.FireStation}). Dispatch state: ${dispatchStatus}. Supply drops status: ${suppliesStatus}.`
        })
      });

      if (result.ok) {
        const data = await result.json();
        const responseText = data.reply || (typeof data === "string" ? data : JSON.stringify(data));
        addMessage("assistant", responseText);
      } else {
        throw new Error();
      }
    } catch {
      // Local client-side intelligence fallback if offline/no key
      const localReply = getLocalChatReply(userText, survivors, pathname);
      addMessage("assistant", localReply);
    } finally {
      setLoading(false);
    }
  };

  // Environmental context plan selector
  const handleContextualPlanRequest = async () => {
    setLoading(true);

    // Determine current plan type based on Pathname & sandbox state
    let planType: ChatMessage["planData"]["planType"] = "general";
    
    if (pathname === "/search") {
      planType = "aircraft";
    } else if (pathname === "/wearables") {
      planType = "wearables";
    } else if (pathname === "/drones") {
      planType = "drones";
    }

    // Trigger API call for parameters block if it is a crash planner
    if (planType === "general" || planType === "aircraft") {
      addMessage("assistant", "Configuring aircraft incident parameters. Please adjust and confirm settings below to build the response plan:", "plan_form");
      setLoading(false);
      return;
    }

    // Instantly generate plans for active environmental screens
    setTimeout(() => {
      let summary = "";
      let riskAssessment = "";

      if (planType === "wildfire") {
        summary = "AI Incident Plan: Active wildfire propagation threatening Sector C canopy. Focus on staging fire barricades and establishing dry staging zones.";
        riskAssessment = "Extreme fire front propagation speed due to NE wind velocity variables.";
      } else if (planType === "flood") {
        summary = "AI Incident Plan: Water front expanding from south basin waterways. Deploy sandbag blockades and mobilize water transport rafts.";
        riskAssessment = "High threat of low-lying base camp inundation in next 10 simulation cycles.";
      } else if (planType === "wearables") {
        summary = `AI Incident Plan: WS Stream shows ${survivors.length} active devices. Sort triage lists and dispatch ambulances directly to critical red statuses.`;
        riskAssessment = "Critical vitals warning: Survivor Gamma heart rate remains elevated above 115 bpm.";
      } else if (planType === "drones") {
        summary = "AI Incident Plan: Drone coverage optimizer active. Set Lawn-mower grid search sweep over Sector A to scan canopy.";
        riskAssessment = "High canopy density limits visual range. Thermal vision sweep recommended.";
      }

      addMessage(
        "assistant",
        `Tactical environmental plan generated for your current screen: ${planType.toUpperCase()}`,
        "plan_display",
        {
          planType,
          summary,
          riskAssessment
        }
      );
      setLoading(false);
      toast.success("Contextual AI Response Plan generated!");
    }, 1000);
  };

  // Triggered on aircraft/general plan parameters submit
  const handleGeneratePlanSubmit = async () => {
    setLoading(true);
    try {
      const response = await api.crashResponsePlan({
        aircraft_type: activePlanParams.aircraftType,
        people_onboard: activePlanParams.peopleOnboard,
        last_known_lat: activePlanParams.lat,
        last_known_lng: activePlanParams.lng,
        terrain: activePlanParams.terrain,
        weather: activePlanParams.weather,
        wearable_survivors: survivors.map(s => ({ id: s.id, name: s.name, status: s.status, lat: s.lat, lng: s.lng }))
      });

      addMessage(
        "assistant",
        "Tactical Response Plan successfully generated. Follow the step-by-step checklist to coordinate emergency assets:",
        "plan_display",
        {
          planType: pathname === "/search" ? "aircraft" : "general",
          aircraftType: activePlanParams.aircraftType,
          peopleOnboard: activePlanParams.peopleOnboard,
          terrain: activePlanParams.terrain,
          weather: activePlanParams.weather,
          lat: activePlanParams.lat,
          lng: activePlanParams.lng,
          summary: response.summary || "Incident response checklist generated.",
          riskAssessment: response.risk_assessment || "Extreme hazard exposure risk."
        }
      );
      toast.success("AI Response Plan generated in assistant!");
    } catch (err) {
      addMessage(
        "assistant",
        "Displaying simulated tactical response checklist:",
        "plan_display",
        {
          planType: "general",
          aircraftType: activePlanParams.aircraftType,
          peopleOnboard: activePlanParams.peopleOnboard,
          terrain: activePlanParams.terrain,
          weather: activePlanParams.weather,
          lat: activePlanParams.lat,
          lng: activePlanParams.lng,
          summary: `Simulated Response Protocol for ${activePlanParams.aircraftType} crash.`,
          riskAssessment: `Exposure risk high due to ${activePlanParams.weather} conditions.`
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 1 Trigger
  const triggerAlertServices = () => {
    setServicesAlerted({
      Police: "transmitting",
      Hospital: "transmitting",
      FireStation: "transmitting"
    });
    toast.info("Sending digital alerts to dispatch terminals...");

    setTimeout(() => {
      setServicesAlerted(prev => ({ ...prev, Police: "alerted" }));
    }, 1000);

    setTimeout(() => {
      setServicesAlerted(prev => ({ ...prev, Hospital: "alerted" }));
    }, 1800);

    setTimeout(() => {
      setServicesAlerted(prev => ({ ...prev, FireStation: "alerted" }));
      toast.success("SOS communications successfully acknowledged!");
    }, 2500);
  };

  // Step 2 Trigger
  const triggerDispatchResponders = async () => {
    setDispatchStatus("routing");
    toast.info("Accessing live WebSockets wearable location telemetry...");

    try {
      const redSurvivors = survivors.filter(s => s.status === "red" || s.status === "yellow");
      for (const s of redSurvivors) {
        await api.dispatchResource({
          resource_id: s.status === "red" ? "A1" : "T1",
          resource_type: s.status === "red" ? "ambulances" : "teams",
          status: "active",
          location: `Rescue sector coordinates (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`
        });
      }
    } catch {
      // simulate success
    }

    setTimeout(() => {
      setDispatchStatus("dispatched");
      toast.success("Ambulances and ground response teams routed to survivors.");
    }, 2000);
  };

  // Step 3 Trigger
  const triggerAirdropSupplies = () => {
    setSuppliesStatus("loading");
    toast.info("Constructing optimized UAV supply loadout...");

    setTimeout(() => {
      setSuppliesStatus("delivered");
      toast.success("Cargo Drone Alpha launched for air-drop mission!");
    }, 2000);
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.18 44), oklch(0.62 0.22 30))",
            boxShadow: "0 4px 20px rgba(249, 115, 22, 0.3)"
          }}
          size="icon"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col border-border/60 shadow-2xl bg-card/95 backdrop-blur-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-border/40">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="h-4.5 w-4.5 text-orange-400 animate-pulse" />
              <span>RescueOS AI Dispatcher</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              ×
            </Button>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-3 pt-2">
            <div 
              className="flex-1 overflow-y-auto pr-1.5"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(249, 115, 22, 0.35) transparent"
              }}
            >
              <div className="space-y-4 pb-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-sm max-w-[88%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-orange-500/15 text-foreground border border-orange-500/10"
                          : "bg-muted/50 text-foreground border border-border/40"
                      }`}
                    >
                      {msg.content}

                      {/* --- Plan Inputs Form (rendered inline inside message bubble) --- */}
                      {msg.type === "plan_form" && (
                        <div className="mt-3.5 space-y-3.5 border-t border-border/40 pt-3 text-xs text-foreground bg-card/50 p-2.5 rounded-lg border">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Aircraft Model</Label>
                            <Select
                              value={activePlanParams.aircraftType}
                              onValueChange={(val) => setActivePlanParams(p => ({ ...p, aircraftType: val }))}
                            >
                              <SelectTrigger className="h-8 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Commercial Passenger Jet">Commercial Passenger Jet</SelectItem>
                                <SelectItem value="Private Charter Jet">Private Charter Jet</SelectItem>
                                <SelectItem value="Cargo transport plane">Military / Cargo Transport</SelectItem>
                                <SelectItem value="Twin-Engine Turboprop">Twin-Engine Turboprop</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Pax Onboard</Label>
                              <Input
                                type="number"
                                value={activePlanParams.peopleOnboard}
                                onChange={(e) => setActivePlanParams(p => ({ ...p, peopleOnboard: parseInt(e.target.value) || 1 }))}
                                className="h-8 bg-background/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Terrain</Label>
                              <Select
                                value={activePlanParams.terrain}
                                onValueChange={(val) => setActivePlanParams(p => ({ ...p, terrain: val }))}
                              >
                                <SelectTrigger className="h-8 bg-background/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Dense Mountainous Forest">Dense Forest</SelectItem>
                                  <SelectItem value="Aquatic / Deep Water Body">Aquatic Basin</SelectItem>
                                  <SelectItem value="Semi-Urban / Industrial Area">Suburban / Industrial</SelectItem>
                                  <SelectItem value="Desert / Arid Flatlands">Desert Flatlands</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Weather</Label>
                            <Input
                              type="text"
                              value={activePlanParams.weather}
                              onChange={(e) => setActivePlanParams(p => ({ ...p, weather: e.target.value }))}
                              className="h-8 bg-background/50"
                            />
                          </div>

                          <Button
                            onClick={handleGeneratePlanSubmit}
                            className="w-full h-8 text-[11px] font-bold uppercase tracking-wider text-white mt-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-none"
                          >
                            Generate Tactical Plan
                          </Button>
                        </div>
                      )}

                      {/* --- Plan Steps Display Checklist (Step by Step Execution) --- */}
                      {msg.type === "plan_display" && msg.planData && (
                        <div className="mt-3.5 space-y-4 border-t border-border/40 pt-3.5 text-xs text-foreground bg-card/60 p-3 rounded-lg border">
                          
                          {/* Event Assessment Header */}
                          <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-400" />
                            <div>
                              <p className="font-bold text-orange-400 uppercase text-[9px] tracking-wide font-mono">AI Assessment Summary</p>
                              <p className="text-muted-foreground text-[10px] leading-relaxed mt-0.5">{msg.planData.summary}</p>
                              <p className="text-[9px] text-red-400 font-mono mt-1 uppercase">Risk: {msg.planData.riskAssessment}</p>
                            </div>
                          </div>

                          {/* Tactical Checklist Steps */}
                          <div className="space-y-3 font-sans">
                            <p className="font-bold text-muted-foreground text-[10px] uppercase font-mono tracking-wider">Tactical Dispatch Steps:</p>
                            
                            {/* Step 1: Dynamic based on planType */}
                            <div className="p-2.5 rounded-lg border bg-background/30 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center border text-[9px] font-bold ${
                                  servicesAlerted.Police === "alerted"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-orange-500/15 text-orange-400 border-orange-500/20"
                                }`}>
                                  {servicesAlerted.Police === "alerted" ? <Check className="h-3 w-3" /> : "1"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground text-[11px]">
                                    {msg.planData.planType === "wildfire" && "Stage Fire Suppression Units"}
                                    {msg.planData.planType === "flood" && "Mobilize Water Rescue Craft"}
                                    {msg.planData.planType === "aircraft" && "Radar Signal Triangulation"}
                                    {msg.planData.planType === "wearables" && "WebSocket Vitals Sync"}
                                    {msg.planData.planType === "drones" && "Initialize Search Pattern Grid"}
                                    {msg.planData.planType === "general" && "Alert Base Camp Logistics"}
                                  </p>
                                  <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                                    {msg.planData.planType === "wildfire" && "Deploy foam engine trucks & firefighters to staging boundaries."}
                                    {msg.planData.planType === "flood" && "Deploy inflatable motorboats to flooded river basin channels."}
                                    {msg.planData.planType === "aircraft" && "Interpolate radar coordinates to locate signal loss point."}
                                    {msg.planData.planType === "wearables" && "Verify active streaming wearable telemetry connection."}
                                    {msg.planData.planType === "drones" && "Configure Lawnmower sweeping path over priority Sector A."}
                                    {msg.planData.planType === "general" && "Establish encrypted satellite comms and alert staging crews."}
                                  </p>
                                </div>
                              </div>

                              {servicesAlerted.Police === "alerted" ? (
                                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Checked: Units notified and staging.
                                </div>
                              ) : (
                                <Button
                                  onClick={triggerAlertServices}
                                  disabled={servicesAlerted.Police === "transmitting"}
                                  className="w-full h-7 text-[10px] font-mono tracking-wide bg-background text-orange-500 border border-orange-500/20 hover:bg-orange-500/10"
                                >
                                  {servicesAlerted.Police === "transmitting" ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Transmitting Alerts...
                                    </>
                                  ) : (
                                    <>
                                      {msg.planData.planType === "wildfire" && "Alert Fire & Foam Crews"}
                                      {msg.planData.planType === "flood" && "Alert Water Rescue Crews"}
                                      {msg.planData.planType === "aircraft" && "Start Radar Interpolation"}
                                      {msg.planData.planType === "wearables" && "Establish WebSockets Link"}
                                      {msg.planData.planType === "drones" && "Set Lawnmower Grid Pattern"}
                                      {msg.planData.planType === "general" && "Alert Base Camp Staging"}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Step 2: Dynamic based on planType */}
                            <div className="p-2.5 rounded-lg border bg-background/30 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center border text-[9px] font-bold ${
                                  dispatchStatus === "dispatched"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-orange-500/15 text-orange-400 border-orange-500/20"
                                }`}>
                                  {dispatchStatus === "dispatched" ? <Check className="h-3 w-3" /> : "2"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground text-[11px]">
                                    {msg.planData.planType === "wildfire" && "Deploy Firewalls"}
                                    {msg.planData.planType === "flood" && "Deploy Sandbag Barriers"}
                                    {msg.planData.planType === "aircraft" && "Route Search Crews"}
                                    {msg.planData.planType === "wearables" && "Route Ambulance to Critical Survivors"}
                                    {msg.planData.planType === "drones" && "Start Vision Detections"}
                                    {msg.planData.planType === "general" && "Route Transit Vehicles"}
                                  </p>
                                  <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                                    {msg.planData.planType === "wildfire" && "Build firewalls to block propagation in forest nodes."}
                                    {msg.planData.planType === "flood" && "Deploy defensive sandbags around low elevation channels."}
                                    {msg.planData.planType === "aircraft" && "Route helicopters to estimated signal loss sector."}
                                    {msg.planData.planType === "wearables" && "Route ground rescue vehicles to Survivor vitals GPS."}
                                    {msg.planData.planType === "drones" && "Begin thermal scanning for survivor heat signatures."}
                                    {msg.planData.planType === "general" && "Establish roads pathways and stage ambulances."}
                                  </p>
                                </div>
                              </div>

                              {dispatchStatus === "dispatched" ? (
                                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Checked: Deployments active.
                                </div>
                              ) : (
                                <Button
                                  onClick={triggerDispatchResponders}
                                  disabled={dispatchStatus === "routing"}
                                  className="w-full h-7 text-[10px] font-mono tracking-wide bg-background text-orange-500 border border-orange-500/20 hover:bg-orange-500/10"
                                >
                                  {dispatchStatus === "routing" ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Routing Dispatch Path...
                                    </>
                                  ) : (
                                    <>
                                      {msg.planData.planType === "wildfire" && "Deploy Staged Firewalls"}
                                      {msg.planData.planType === "flood" && "Deploy Sandbag Barriers"}
                                      {msg.planData.planType === "aircraft" && "Dispatch Search Crews"}
                                      {msg.planData.planType === "wearables" && "Route Transit to Critical Survivors"}
                                      {msg.planData.planType === "drones" && "Start Vision Processing"}
                                      {msg.planData.planType === "general" && "Route Staging Ambulances"}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Step 3: Dynamic based on planType */}
                            <div className="p-2.5 rounded-lg border bg-background/30 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center border text-[9px] font-bold ${
                                  suppliesStatus === "delivered"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-orange-500/15 text-orange-400 border-orange-500/20"
                                }`}>
                                  {suppliesStatus === "delivered" ? <Check className="h-3 w-3" /> : "3"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground text-[11px]">
                                    {msg.planData.planType === "wildfire" && "Launch Aid Drone"}
                                    {msg.planData.planType === "flood" && "Launch Rescue UAV"}
                                    {msg.planData.planType === "aircraft" && "Launch Supply Drone"}
                                    {msg.planData.planType === "wearables" && "Launch Med-Kit Drone"}
                                    {msg.planData.planType === "drones" && "Approve Beacon Deployment"}
                                    {msg.planData.planType === "general" && "Approve UAV Aid Dispatch"}
                                  </p>
                                  <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                                    {msg.planData.planType === "wildfire" && "Airdrop fire protective blankets and water boxes."}
                                    {msg.planData.planType === "flood" && "Airdrop self-inflating vests and emergency rafts."}
                                    {msg.planData.planType === "aircraft" && "Deploy cargo drone carrying emergency base logistics."}
                                    {msg.planData.planType === "wearables" && "Deploy cargo drone loaded with first-aid medical crates."}
                                    {msg.planData.planType === "drones" && "Airdrop signal repeater beacons to improve WS coverage."}
                                    {msg.planData.planType === "general" && "Deploy cargo drone carrying vital relief kits."}
                                  </p>
                                </div>
                              </div>

                              {suppliesStatus === "delivered" ? (
                                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Checked: Cargo Drone Launched.
                                </div>
                              ) : (
                                <Button
                                  onClick={triggerAirdropSupplies}
                                  disabled={suppliesStatus === "loading"}
                                  className="w-full h-7 text-[10px] font-mono tracking-wide bg-background text-orange-500 border border-orange-500/20 hover:bg-orange-500/10"
                                >
                                  {suppliesStatus === "loading" ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Loading UAV Package...
                                    </>
                                  ) : (
                                    <>
                                      {msg.planData.planType === "wildfire" && "Dispatch Cargo Drone"}
                                      {msg.planData.planType === "flood" && "Dispatch Rescue UAV"}
                                      {msg.planData.planType === "aircraft" && "Launch Supply Drone"}
                                      {msg.planData.planType === "wearables" && "Launch Med-Kit Drone"}
                                      {msg.planData.planType === "drones" && "Approve Beacon Deployment"}
                                      {msg.planData.planType === "general" && "Approve UAV Aid Dispatch"}
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                          </div>
                        </div>
                      )}

                      {/* --- Step 1 SOS Status Panel --- */}
                      {msg.type === "sos_panel" && (
                        <div className="mt-3.5 space-y-3 border-t border-border/40 pt-3 text-xs bg-card/60 p-3 rounded-lg border">
                          <p className="font-bold text-muted-foreground text-[10px] uppercase font-mono tracking-wider">Responder Staging Status:</p>
                          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                            {[
                              { label: "POLICE", state: servicesAlerted.Police },
                              { label: "HOSPITAL", state: servicesAlerted.Hospital },
                              { label: "FIRE RESCUE", state: servicesAlerted.FireStation }
                            ].map(x => (
                              <div
                                key={x.label}
                                className={`rounded p-1.5 border ${
                                  x.state === "alerted" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                  x.state === "transmitting" ? "bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse" :
                                  "bg-background text-muted-foreground"
                                }`}
                              >
                                <div>{x.label}</div>
                                <div className="text-[8px] opacity-80 mt-0.5">
                                  {x.state === "idle" && "Standby"}
                                  {x.state === "transmitting" && "Sending..."}
                                  {x.state === "alerted" && "ALERTED"}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            onClick={triggerAlertServices}
                            disabled={servicesAlerted.Police === "alerted" || servicesAlerted.Police === "transmitting"}
                            className="w-full h-8 text-[11px]"
                            variant="outline"
                          >
                            {servicesAlerted.Police === "alerted" ? "SOS Broadcast Active" : "Broadcast SOS Alert Now"}
                          </Button>
                        </div>
                      )}

                      {/* --- Step 2 Dispatch Panel --- */}
                      {msg.type === "dispatch_panel" && (
                        <div className="mt-3.5 space-y-3.5 border-t border-border/40 pt-3 text-xs bg-card/60 p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] uppercase font-mono text-muted-foreground">Active Wearable Signals:</span>
                            <span className="text-[9px] font-mono text-emerald-400 animate-pulse">● Live WebSockets</span>
                          </div>
                          
                          <div className="space-y-1.5">
                            {survivors.slice(0, 3).map((s) => (
                              <div key={s.id} className="flex justify-between items-center rounded border bg-background/50 p-2 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-1.5 w-1.5 rounded-full ${s.status === "red" ? "bg-red-500 animate-pulse" : s.status === "yellow" ? "bg-yellow-500" : "bg-emerald-500"}`} />
                                  <span className="font-bold">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground font-mono">
                                  <Heart className="h-3 w-3 text-red-500/80" /> {s.vitals.heart_rate} bpm
                                  <MapPin className="h-3 w-3 text-primary/80" /> {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            onClick={triggerDispatchResponders}
                            disabled={dispatchStatus === "dispatched" || dispatchStatus === "routing"}
                            className="w-full h-8 text-[11px]"
                            variant="outline"
                          >
                            {dispatchStatus === "dispatched" ? "Responder Units Routed" : "Route Responders to Signals"}
                          </Button>
                        </div>
                      )}

                      {/* --- Step 3 Supplies Panel --- */}
                      {msg.type === "supplies_panel" && (
                        <div className="mt-3.5 space-y-3.5 border-t border-border/40 pt-3 text-xs bg-card/60 p-3 rounded-lg border">
                          <p className="font-bold text-muted-foreground text-[10px] uppercase font-mono tracking-wider">Airdrop Cargo Calculator:</p>
                          <table className="w-full text-left text-[9px] font-mono border border-border/30">
                            <thead>
                              <tr className="bg-muted border-b border-border/30">
                                <th className="p-1">Supply Item</th>
                                <th className="p-1 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-1">Medical kits</td>
                                <td className="p-1 text-right">30 packs</td>
                              </tr>
                              <tr>
                                <td className="p-1">Water Bottles</td>
                                <td className="p-1 text-right">180 liters</td>
                              </tr>
                              <tr>
                                <td className="p-1">Thermal blankets</td>
                                <td className="p-1 text-right">65 items</td>
                              </tr>
                            </tbody>
                          </table>

                          <Button
                            onClick={triggerAirdropSupplies}
                            disabled={suppliesStatus === "delivered" || suppliesStatus === "loading"}
                            className="w-full h-8 text-[11px]"
                            variant="outline"
                          >
                            {suppliesStatus === "delivered" ? "UAV Cargo Launched" : "Approve Cargo Drone Dispatch"}
                          </Button>
                        </div>
                      )}

                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/20 max-w-[80%]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
                    <span>Processing command...</span>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            </div>

            <div className="flex gap-2 border-t border-border/40 pt-3 bg-card mt-1">
              <Input
                placeholder="Type 'generate plan' or ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
                className="h-9 bg-background/50 border-border/60 text-xs"
              />
              <Button size="icon" className="h-9 w-9 bg-orange-500 hover:bg-orange-600 text-white shrink-0" onClick={handleSend} disabled={loading}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function getLocalChatReply(input: string, survivors: SurvivorData[], pathname: string): string {
  const lower = input.toLowerCase();
  
  // Custom responses dependent on pathname context!

  if (pathname === "/search") {
    if (lower.includes("aircraft") || lower.includes("flight") || lower.includes("radar")) {
      return "The active search is targeting flight signals near the northwest ridge sectors. Select depart/destination airports and start tracking simulation to run estimates.";
    }
  }

  if (pathname === "/wearables") {
    if (lower.includes("survivor") || lower.includes("vitals") || lower.includes("heart")) {
      const red = survivors.filter(s => s.status === "red");
      return `Wearable telemetry links show ${survivors.length} active devices. ${red.length} survivors in Critical status (RED). Ambulance Alpha is on standby to route directly.`;
    }
  }

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello operator. I am the RescueOS AI Dispatch Assistant. I am synced with your page environment. How can I help you coordinate rescue missions today?";
  }
  if (lower.includes("drone") || lower.includes("uav")) {
    return `Drone 2 is patrolling Sector C. Drone 3 is available at Base Camp. You can trigger a supply cargo drop directly from the chat by typing 'supply drop'.`;
  }
  if (lower.includes("weather") || lower.includes("wind")) {
    return "Current reports indicate gale force gusts up to 22m/s approaching in 18 minutes. Grounding recommendations active for light drone sweeps.";
  }
  return "Copy that, operator. I can assist with flight simulation zones, weather metrics, and staged evacuation templates. Let me know if you would like me to build a tactical plan for this screen.";
}
