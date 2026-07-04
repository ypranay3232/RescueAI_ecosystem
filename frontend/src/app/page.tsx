"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, Radio, Shield, Plane, Zap, Globe, Target, Activity, Lock,
  Search, Eye, Heart, Sparkles, Users, CheckCircle2, ChevronRight, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Preloader } from "@/components/ui/loader";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { SoundController } from "@/components/ui/sound-controller";

gsap.registerPlugin(ScrollTrigger);

// Dynamically import Three.js components to prevent SSR / Hydration mismatch issues
const EarthGlobe = dynamic(
  () => import("@/components/3d/earth-globe").then((m) => m.EarthGlobe),
  { ssr: false }
);

// 6 chapters copy and assets
const CHAPTERS = [
  {
    icon: Globe,
    title: "Command Center",
    tagline: "One map. Every operation.",
    desc: "Unify maps, telemetry feeds, weather profiles, and dispatch routes in a single operational picture. Know where your units are and where they are needed.",
    color: "#3EE6E0", // Electric cyan
    metric: { value: "6 Modules", label: "Unified in one console" },
    image: "/images/globe.png",
    highlights: ["Interactive OpenStreetMap layering", "Dynamic flight paths and routes", "Live responder telemetry status"]
  },
  {
    icon: Search,
    title: "Missing Aircraft Search",
    tagline: "When the signal drops, the search doesn't stop.",
    desc: "Simulate signal-loss events and generate AI-estimated crash zones and search polygons automatically. Grounded in flight dynamics and atmospheric winds.",
    color: "#FF4D2E", // Amber-red
    metric: { value: "< 3 Sec", label: "AI crash-zone calculation" },
    image: "/images/search.png",
    highlights: ["Real-time ADS-B signal-loss tracker", "Expanding probability search grids", "Wind drift calculation vectors"]
  },
  {
    icon: Eye,
    title: "Drone Vision AI",
    tagline: "Every frame scanned for a life.",
    desc: "Upload drone footage straight to the AI classifier. Scan wilderness, coastlines, and debris fields to detect human survivors in seconds.",
    color: "#5CFFB0", // Signal green
    metric: { value: "98.4%", label: "Target detection accuracy" },
    image: "/images/drones.png",
    highlights: ["Parallel AI image batch scanning", "Automated bounding boxes & coordinates", "Instant dispatch pins from hits"]
  },
  {
    icon: Heart,
    title: "Wearable Tracking",
    tagline: "Know they're alive before you reach them.",
    desc: "Monitor GPS locations, body temperature, and heart rates of found survivors in real time. Prioritize transport based on critical vitals triage.",
    color: "#FF3E82", // Pulse pink
    metric: { value: "0.5s Latency", label: "Survivor telemetry feed" },
    image: "/images/wearables.png",
    highlights: ["GPS coordinates + heart rate waveforms", "Automatic triage color-coding", "Battery and signal strength alerts"]
  },
  {
    icon: Sparkles,
    title: "Rescue Planner",
    tagline: "An advisor that never sleeps.",
    desc: "Engage LLM-backed decision support systems (Gemini & GPT) to suggest dispatch vectors, road routing, and supply distribution schedules.",
    color: "#A855F7", // AI purple
    metric: { value: "24/7 AI", label: "Operational decision advisor" },
    image: "/images/globe.png", // Reusing base globe image
    highlights: ["Prioritized rescue checklists", "Road routing and drive-time calculations", "Natural-language task dispatching"]
  },
  {
    icon: Users,
    title: "Resource Manager",
    tagline: "Every unit, one command.",
    desc: "Coordinate helicopters, drones, ambulances, police, and field rescue teams. Automate ETAs to nearby trauma centers using real road routing.",
    color: "#EAB308", // Warning yellow
    metric: { value: "30km Radius", label: "Local emergency service layer" },
    image: "/images/resources.png",
    highlights: ["Live Overpass API service overlays", "OSRM road routing polylines", "Click-to-dispatch team management"]
  }
];

export default function RebuiltLandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  // Flight simulation states for the Hero Globe
  const [flightProgress, setFlightProgress] = useState(0);
  const [signalLost, setSignalLost] = useState(false);
  const [simStatus, setSimStatus] = useState("FLIGHT IN PROGRESS...");

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Hero Globe Simulation cycle
  useEffect(() => {
    if (!loaded) return;

    let progress = 0;
    const interval = setInterval(() => {
      if (!signalLost) {
        progress += 0.01;
        setFlightProgress(Math.min(progress, 0.45));
        
        if (progress >= 0.45) {
          setSignalLost(true);
          setSimStatus("ALERT: ADS-B SIGNAL LOSS DETECTED");
          // Sonar trigger indicator
          gsap.fromTo(".radar-hud-alert", 
            { backgroundColor: "rgba(239, 68, 68, 0)" },
            { backgroundColor: "rgba(239, 68, 68, 0.15)", duration: 0.5, yoyo: true, repeat: 5 }
          );
        }
      }
    }, 80);

    // Reset loop every 10 seconds
    const resetTimer = setInterval(() => {
      setSignalLost(false);
      setFlightProgress(0);
      progress = 0;
      setSimStatus("FLIGHT IN PROGRESS...");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(resetTimer);
    };
  }, [loaded, signalLost]);

  // Scroll observer to update active slide on scroll
  useEffect(() => {
    if (!loaded) return;

    const observers = sectionRefs.current.map((ref, idx) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveChapter(idx);
          }
        },
        {
          root: null,
          rootMargin: "-45% 0px -45% 0px", // triggers when section hits middle of screen
        }
      );
      
      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach((obs) => obs?.disconnect());
    };
  }, [loaded]);

  const handlePreloaderComplete = (audio: boolean) => {
    setLoaded(true);
    setAudioEnabled(audio);

    // Fade-in animations
    gsap.fromTo(".hero-animate-in",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" }
    );
  };

  return (
    <div
      className="min-h-screen text-[#F4F5F7] overflow-x-hidden font-sans relative"
      style={{ background: "oklch(0.08 0.012 265)" }}
    >
      {/* Cinematic entry preloader */}
      {!loaded && <Preloader onComplete={handlePreloaderComplete} />}

      {/* Trailing crosshair cursor */}
      <CustomCursor />

      {/* Web Audio API Sound Synthesizer */}
      <SoundController enabled={loaded && audioEnabled} />

      {/* Background stars canvas overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute inset-0 grid-bg opacity-10" />
      </div>

      {/* Navigation HUD */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/35 brand-glow">
            <Radio className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-sm uppercase">RescueOS</span>
            <span className="text-[10px] text-orange-500/80 block font-mono -mt-1 tracking-widest">COMMAND LAYER</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 bg-white/5 border border-white/10">
            <span className="status-dot status-dot-green h-1.5 w-1.5" />
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">SYS ACTIVE</span>
          </div>
          <Link href="/dashboard">
            <Button
              size="sm"
              className="rounded-xl font-bold uppercase tracking-wider text-xs border border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white hover:scale-105 transition-all duration-300 clickable cursor-pointer"
            >
              Enter Console
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Section 1: Cinematic Hero ─────────────────────── */}
      <section className="min-h-screen relative flex flex-col justify-center px-6 md:px-12 pt-28 z-10">
        <div className="grid md:grid-cols-12 gap-8 items-center max-w-7xl mx-auto w-full">
          {/* Hero text branding */}
          <div className="md:col-span-6 flex flex-col justify-center text-left">
            <p className="hero-animate-in mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4.5 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-orange-500 w-max">
              <span className="status-dot status-dot-orange" />
              SATELLITE TELEMETRY SECURED
            </p>

            <h1 className="hero-animate-in text-4xl md:text-6xl font-black tracking-tight leading-[1.05] text-white">
              When the signal drops,
              <br />
              <span className="text-gradient-brand">RescueOS picks it up.</span>
            </h1>

            <p className="hero-animate-in mt-6 max-w-lg text-sm md:text-base leading-relaxed text-white/55">
              Six rescue systems integrated into a single real-time command layer. Dynamic flight loss tracking, AI crash-zone estimation, drone vision diagnostics, and survivor vital feeds. Zero seconds lost.
            </p>

            <div className="hero-animate-in mt-10 flex flex-wrap gap-4">
              <a
                href="#chapters"
                className="clickable group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-4 font-bold text-sm tracking-wide text-white hover:scale-105 hover:shadow-[0_0_30px_oklch(0.72_0.18_44_/_0.4)] transition-all duration-300"
              >
                See the Platform
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <Link href="/search">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-4 font-semibold text-sm tracking-wide text-white/90 clickable backdrop-blur-md cursor-pointer"
                >
                  Request a Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* 3D Globe Telemetry HUD */}
          <div className="md:col-span-6 relative flex justify-center items-center">
            <div className="w-full max-w-xl aspect-square relative rounded-3xl border border-white/15 bg-black/40 backdrop-blur-2xl overflow-hidden radar-hud-alert shadow-2xl">
              {/* Telemetry markings */}
              <div className="absolute top-4 left-4 font-mono text-[9px] text-white/35 flex flex-col gap-0.5 pointer-events-none">
                <span>COMMS: SECURE</span>
                <span>OSRM ROAD LAYER: DEPLOYED</span>
              </div>
              <div className="absolute top-4 right-4 font-mono text-[9px] text-white/35 text-right pointer-events-none">
                <span>BEARING: 042°</span>
                <span>SYS STRENGTH: 99.4%</span>
              </div>
              
              {/* Globe render */}
              {loaded && (
                <div className="w-full h-full scale-[1.05]">
                  <EarthGlobe
                    height="100%"
                    flightProgress={flightProgress}
                    signalLost={signalLost}
                    startLat={40.7128}
                    startLng={-74.0060} // NYC
                    endLat={51.5074}
                    endLng={-0.1278}   // London
                    crashLat={48.5}
                    crashLng={-38.4}    // Simulated midpoint signal drop
                  />
                </div>
              )}

              {/* HUD Flight Warning Panel */}
              <div className={`absolute bottom-4 left-4 right-4 p-3 border font-mono text-[10px] uppercase rounded-xl transition-all duration-300 backdrop-blur ${
                signalLost 
                  ? "bg-red-950/80 border-red-500/40 text-red-400" 
                  : "bg-black/60 border-white/10 text-orange-500"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${signalLost ? "bg-red-500 animate-ping" : "bg-orange-500 animate-pulse"}`} />
                    {simStatus}
                  </span>
                  <span>LKP CAPTURE</span>
                </div>
                <div className="flex justify-between text-white/50 text-[9px]">
                  <span>POS: 48.500° N, 38.400° W</span>
                  <span>ALT: {signalLost ? "0 FT (LKP)" : "35,000 FT"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: The Moment Everything Changes (Problem Statement) ── */}
      <section className="py-24 relative z-10 px-6 max-w-7xl mx-auto">
        <div className="border border-white/10 rounded-[32px] p-8 md:p-16 bg-gradient-to-b from-white/[0.04] to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-red-500">THE PROBLEM GROUNDED IN TRUTH</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mt-3 text-white">
                When critical systems fragment, rescue time multiplies.
              </h2>
              <p className="mt-6 text-sm md:text-base text-white/50 leading-relaxed max-w-xl">
                During the &ldquo;Golden Hour&rdquo; of search and rescue, seconds translate directly to survival. Response units suffer from fragmented interfaces: routing tables on one screen, live wearables on another, and raw video feeds waiting for manual review. RescueOS merges all six operations into a single cohesive system.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 font-mono">
                  <span className="text-xl font-bold text-orange-500">40%</span>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Average Response Lag</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 font-mono">
                  <span className="text-xl font-bold text-orange-500">0s</span>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Telemetry Lag target</p>
                </div>
              </div>
            </div>

            {/* Simulated problem HUD visualizer */}
            <div className="md:col-span-5 border border-white/10 bg-black/60 rounded-2xl p-6 font-mono text-xs relative overflow-hidden flex flex-col gap-4">
              <div className="absolute inset-0 scanline opacity-10" />
              <div className="flex justify-between items-center text-white/40 text-[10px] border-b border-white/5 pb-2">
                <span>TERMINAL DIALOGUE LOG</span>
                <span>SECURE HOST</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-white/60">&gt; SEARCH FLIGHT: AF-447</span>
                <span className="text-white/40">&gt; STATUS: ADS-B TELEMETRY CUTS OUT</span>
                <span className="text-red-500 animate-pulse">&gt; ERROR: GPS POSITION LOST AT 00:43Z</span>
                <span className="text-white/35">&gt; CALCULATING SEARCH POLYGON...</span>
                <span className="text-emerald-400 font-bold">&gt; OK: AI PREDICTION ZONE CONSTRUCTED [60KM RAD]</span>
              </div>

              <div className="p-4.5 rounded-xl border border-red-500/20 bg-red-500/5 mt-2">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-[11px] mb-1 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  EMERGENCY STATE DECLARED
                </div>
                <p className="text-[10px] text-white/50">LKP Coordinates locked. AI dispatching automated drones and monitoring survivor wearable sensors.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: The 6-Step System (Interactive Scroll) ── */}
      <section id="chapters" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          <p className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-orange-500">THE SCROLL CHAPTERS</p>
          <h2 className="text-3xl md:text-5xl font-black mt-3 text-white">
            Six systems. One command layer.
          </h2>
          <p className="text-white/50 text-sm md:text-base mt-4 max-w-xl mx-auto">
            Scroll down to watch how an incident response moves across our six unified modules, tracing the timeline from signal loss to survivor recovery.
          </p>
        </div>

        {/* Vertical Split Scroll Container */}
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 relative">
          
          {/* Sticky left panel: Descriptive text cards */}
          <div className="md:col-span-5 flex flex-col gap-[40vh] md:pb-[30vh]">
            {CHAPTERS.map((chap, idx) => {
              const Icon = chap.icon;
              return (
                <div
                  key={chap.title}
                  ref={(el) => { sectionRefs.current[idx] = el; }}
                  className={`scroll-mt-36 p-8 rounded-3xl border transition-all duration-500 flex flex-col justify-center ${
                    activeChapter === idx 
                      ? "bg-white/[0.04] border-white/10 shadow-2xl scale-[1.02]" 
                      : "bg-transparent border-transparent opacity-25 scale-95"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mb-6 font-bold"
                    style={{
                      background: `${chap.color}15`,
                      border: `1.5px solid ${chap.color}35`,
                      boxShadow: activeChapter === idx ? `0 0 16px ${chap.color}30` : "none"
                    }}
                  >
                    <Icon className="h-5.5 w-5.5" style={{ color: chap.color }} />
                  </div>

                  {/* Title and Tagline */}
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: chap.color }}>
                    STAGE 0{idx + 1} &middot; {chap.title}
                  </span>
                  <h3 className="text-2xl font-extrabold text-white mt-2 leading-tight">
                    {chap.tagline}
                  </h3>
                  
                  {/* Body description */}
                  <p className="text-white/55 text-sm leading-relaxed mt-4">
                    {chap.desc}
                  </p>

                  {/* Highlights list */}
                  <ul className="mt-6 flex flex-col gap-2.5">
                    {chap.highlights.map((hl) => (
                      <li key={hl} className="flex items-start gap-2 text-xs text-white/70">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: chap.color }} />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Metric stats card */}
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold tracking-tight text-white font-mono">{chap.metric.value}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{chap.metric.label}</div>
                    </div>
                    <Link href={`/${chap.title.toLowerCase().split(" ").join("-")}`}>
                      <span className="clickable text-xs font-semibold flex items-center gap-1 hover:text-white transition-colors" style={{ color: chap.color }}>
                        Interactive demo <ChevronRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky right panel: High-fidelity image & interactive HUD overlays */}
          <div className="hidden md:block md:col-span-7 sticky top-28 h-[75vh] self-start rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 grid-bg opacity-10" />
            <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />

            {/* Slider Images with custom styling & overlays */}
            {CHAPTERS.map((chap, idx) => (
              <div
                key={chap.title}
                className={`absolute inset-0 transition-opacity duration-700 flex flex-col justify-center items-center p-6 ${
                  activeChapter === idx ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                {/* Visual Frame */}
                <div className="w-full h-full max-h-[50vh] relative border border-white/10 bg-zinc-950/80 rounded-2xl overflow-hidden flex items-center justify-center">
                  
                  {/* Render the background image */}
                  <img
                    src={chap.image}
                    alt={chap.title}
                    className="w-full h-full object-cover opacity-80"
                  />

                  {/* Neon overlay border based on slide theme */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-300"
                    style={{
                      border: `1.5px solid ${activeChapter === idx ? chap.color + "25" : "transparent"}`,
                      boxShadow: activeChapter === idx ? `inset 0 0 40px ${chap.color}10` : "none"
                    }}
                  />

                  {/* DYNAMIC SCREEN OVERLAYS (HUD) */}
                  {/* Chapter 1: Command Center */}
                  {idx === 0 && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/85 border border-cyan-500/25 p-3.5 rounded-xl font-mono text-[9px] text-cyan-400 flex justify-between items-center backdrop-blur">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>SATELLITE TRACE STABLE (NOAA-19)</span>
                      </div>
                      <span>GRID COMPLETED</span>
                    </div>
                  )}

                  {/* Chapter 2: Aircraft Search */}
                  {idx === 1 && (
                    <div className="absolute top-4 left-4 bg-red-950/90 border border-red-500/35 p-3 rounded-lg font-mono text-[9px] text-red-400 backdrop-blur">
                      <div className="font-bold mb-1">PROBABILITY CONE</div>
                      <span>RADIUS: 38.6 KM | AREA: 1,170 SQ KM</span>
                    </div>
                  )}

                  {/* Chapter 3: Drone Vision */}
                  {idx === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {/* Detection Target Box */}
                      <div className="border-2 border-emerald-400 h-28 w-28 relative animate-pulse flex flex-col justify-between p-1.5">
                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/90 border border-emerald-400/40 px-1 py-0.5 rounded w-max">
                          SURVIVOR 98.4%
                        </span>
                        <span className="text-[7px] font-mono text-emerald-400 self-end">
                          LAT: 48.5012 | LNG: -38.3942
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Chapter 4: Wearables */}
                  {idx === 3 && (
                    <div className="absolute top-4 right-4 bg-pink-950/90 border border-pink-500/35 p-3 rounded-xl font-mono text-[9px] text-pink-400 flex flex-col gap-1 backdrop-blur w-44">
                      <div className="flex justify-between items-center font-bold">
                        <span>HR: 78 BPM</span>
                        <Heart className="h-3 w-3 animate-pulse text-pink-500" />
                      </div>
                      <div className="h-6 w-full overflow-hidden relative border-t border-pink-500/20 mt-1">
                        {/* Simulating vitals line */}
                        <svg className="w-full h-full stroke-pink-500 stroke-[1.5] fill-none" viewBox="0 0 100 20">
                          <path d="M0,10 L20,10 L25,5 L30,15 L35,10 L50,10 L55,0 L60,20 L65,10 L80,10 L85,6 L90,10 L100,10" className="animate-pulse" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] text-pink-300/60 mt-1">
                        <span>SPO2: 96%</span>
                        <span>TEMP: 36.8°C</span>
                      </div>
                    </div>
                  )}

                  {/* Chapter 5: Rescue Planner */}
                  {idx === 4 && (
                    <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/90 border border-purple-500/30 p-3 rounded-lg font-mono text-[8px] text-purple-300 flex flex-col gap-1 backdrop-blur">
                      <div>&gt; AI RECOMMENDATION ENVELOPE:</div>
                      <div className="text-white/70">&gt; CLEAR WEATHER REPORT. RECOMMEND DRONE FLIGHT GROUP B FROM COMMAND POINT ST-2.</div>
                    </div>
                  )}

                  {/* Chapter 6: Resource Manager */}
                  {idx === 5 && (
                    <div className="absolute top-4 right-4 bg-yellow-950/90 border border-yellow-500/30 p-3 rounded-lg font-mono text-[9px] text-yellow-400 backdrop-blur">
                      <div className="font-bold">DISPATCHING RESCUERS</div>
                      <div className="text-[8px] text-white/50 mt-1">BASE B --&gt; CRASH ZONE LKP</div>
                    </div>
                  )}
                </div>

                {/* HUD Footer status metrics for active slide */}
                <div className="w-full mt-4 flex justify-between items-center font-mono text-[10px] text-white/40 px-2">
                  <span>TELEMETRY CHANNEL 0{idx + 1}</span>
                  <span>CALIBRATION CONFIRMED</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View: Vertical scrolling card fallback */}
        <div className="md:hidden flex flex-col gap-6 px-6 mt-10">
          {CHAPTERS.map((chap, idx) => {
            const Icon = chap.icon;
            return (
              <div
                key={chap.title}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                    <Icon className="h-5 w-5" style={{ color: chap.color }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider block" style={{ color: chap.color }}>
                      STAGE 0{idx + 1}
                    </span>
                    <h4 className="text-lg font-bold text-white leading-tight">
                      {chap.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed">
                  {chap.desc}
                </p>

                {/* Mobile Mock image asset */}
                <div className="aspect-[16/9] w-full relative rounded-xl overflow-hidden border border-white/5 mt-2 bg-black">
                  <img src={chap.image} alt={chap.title} className="w-full h-full object-cover opacity-70" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 4: Technical Credibility (Under the Hood) ── */}
      <section className="py-24 relative z-10 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-orange-500">TECHNICAL ARCHITECTURE</p>
          <h2 className="text-3xl md:text-5xl font-black mt-3 text-white">
            Built for actual deployment.
          </h2>
          <p className="text-white/50 text-sm md:text-base mt-4 max-w-xl mx-auto">
            Not a prototype. RescueOS is powered by production-grade API integrations and high-performance frontend engineering.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Tile 1 */}
          <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-6">
              <Map className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Leaflet & Overpass Mapping</h3>
            <p className="text-xs text-white/50 leading-relaxed mt-3">
              Render lightweight interactive maps with dynamic tile style routing. Layer live hospitals, fire stations, and base camps instantly via Overpass API queries.
            </p>
          </div>

          {/* Tile 2 */}
          <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-6">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Open-Meteo Weather Layers</h3>
            <p className="text-xs text-white/50 leading-relaxed mt-3">
              Calculate wind speed vectors, temperatures, and rain rates directly over the search coordinate grid. Real wind vectors automatically update search probabilities.
            </p>
          </div>

          {/* Tile 3 */}
          <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-6">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Multi-AI Advisor Stack</h3>
            <p className="text-xs text-white/50 leading-relaxed mt-3">
              Combines Google Gemini&apos;s contextual reasoning with OpenAI models to output structured checklists, ETA estimates, and field routing logic dynamically.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 5: Built to Extend (Differentiator checklist) ── */}
      <section className="py-24 relative z-10 px-6 max-w-5xl mx-auto">
        <div className="border border-white/10 rounded-[32px] p-8 md:p-16 bg-zinc-950/80 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
          
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-orange-500">PLATFORM ARCHITECTURE</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 leading-tight">
              An extensible ecosystem.
            </h2>
            <p className="text-white/50 text-sm mt-4 leading-relaxed">
              RescueOS is built on reusable core layers—meaning new tracking sensors, custom drone neural nets, or new response checklists plug into the same established components out of the box.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              <div className="flex gap-2.5 items-start">
                <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Reusable HUD Components</h4>
                  <p className="text-xs text-white/40 mt-1">Telemetry tables, maps, and status strips scale together.</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Standard Event Bus</h4>
                  <p className="text-xs text-white/40 mt-1">Sensor alerts propagate uniformly to coordinates.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Action CTA (Join the Network / Enter Platform) ── */}
      <section className="py-24 relative z-10 px-6 text-center">
        <div className="max-w-3xl mx-auto rounded-[36px] border border-orange-500/25 bg-gradient-to-b from-orange-500/10 to-transparent p-10 md:p-16 backdrop-blur shadow-[0_0_60px_oklch(0.72_0.18_44_/_0.08)]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/35 mb-6 brand-glow">
            <Lock className="h-7 w-7 text-orange-500" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Ready to deploy?
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/50 leading-relaxed max-w-xl mx-auto">
            Launch the simulation cockpit, test AI crash vectors on active map tiles, or explore the live responder resources.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-4 font-bold text-sm tracking-wide text-white hover:scale-105 hover:shadow-[0_0_30px_oklch(0.72_0.18_44_/_0.3)] transition-all duration-300 cursor-pointer"
              >
                Launch Command Center
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="clickable flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-4 font-semibold text-sm tracking-wide text-white/90 backdrop-blur"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 relative z-10 text-center font-mono text-[10px] text-white/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span>RESCUEOS AI SECURE HOST &middot; PLATFORM VERSION 2.0.0</span>
          <span>BUILT FOR GENERAL RESPONSE IN THE FIELD &middot; MIT LICENSE 2026</span>
        </div>
      </footer>
    </div>
  );
}
