"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, Shield, Volume2, VolumeX } from "lucide-react";
import { gsap } from "gsap";

interface PreloaderProps {
  onComplete: (audioEnabled: boolean) => void;
}

const SYSTEM_LOGS = [
  "ESTABLISHING SECURE SATELLITE COMMS LINK...",
  "ACQUIRING ORBITAL TELEMETRY...",
  "MOUNTING SENSOR DEPLOYMENT MATRIX...",
  "CONNECTING TO OPEN-METEO ENVIRONMENTAL API...",
  "INDEXING OVERPASS API EMERGENCY LAYERS...",
  "INITIALIZING GEMINI & OPENAI REASONING ENGINES...",
  "CALIBRATING GROUND RESCUE COORDINATORS...",
  "SYNCING SURVIVOR WEARABLE GPS CHANNELS...",
  "ESTABLISHING FEEDBACK TELEMETRY LOOP...",
  "RESCUEOS COMMS LAYER SECURED."
];

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentLog, setCurrentLog] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Increment progress
    const duration = 2.5; // seconds
    const intervalTime = 25; // ms
    const totalSteps = (duration * 1000) / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentProgress = Math.min(Math.round((step / totalSteps) * 100), 100);
      setProgress(currentProgress);

      // Map progress to logs
      const logIndex = Math.min(
        Math.floor((currentProgress / 100) * SYSTEM_LOGS.length),
        SYSTEM_LOGS.length - 1
      );
      setCurrentLog(SYSTEM_LOGS[logIndex]);

      if (currentProgress >= 100) {
        clearInterval(timer);
        setIsFinished(true);
        
        // Pulse enter section
        gsap.to(".enter-hud-btn", {
          borderColor: "oklch(0.72 0.18 44)",
          boxShadow: "0 0 20px oklch(0.72 0.18 44 / 0.4)",
          duration: 1,
          repeat: -1,
          yoyo: true
        });
      }
    }, intervalTime);

    // Radar pulse animation
    gsap.fromTo(
      radarRef.current,
      { scale: 0.8, opacity: 0.8 },
      { scale: 1.5, opacity: 0, duration: 1.8, repeat: -1, ease: "power2.out" }
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleEnter = (audioEnabled: boolean) => {
    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => onComplete(audioEnabled)
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-mono text-[#F4F5F7]"
    >
      {/* HUD Background grid */}
      <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
      
      {/* Radar scanning scanlines */}
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />

      {/* Central radar visualizer */}
      <div className="relative mb-12 flex h-48 w-48 items-center justify-center">
        {/* Pulsing rings */}
        <div
          ref={radarRef}
          className="absolute h-40 w-40 rounded-full border border-orange-500/30"
        />
        <div className="absolute h-32 w-32 rounded-full border border-orange-500/20 animate-ping opacity-25" />
        <div className="absolute h-24 w-24 rounded-full border border-orange-500/10" />

        {/* Central pulsing core */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-500 bg-black/80 z-10 brand-glow"
        >
          <Radio className="h-6 w-6 text-orange-500 animate-pulse" />
        </div>
      </div>

      {/* Progress metrics */}
      <div className="relative z-10 w-full max-w-lg px-6 text-center">
        <div className="mb-2 flex items-center justify-between text-xs tracking-widest text-orange-500/80">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> SYSTEM BOOT TELEMETRY
          </span>
          <span>{progress}%</span>
        </div>

        {/* Bar */}
        <div className="mb-6 h-1 w-full overflow-hidden bg-white/5 border border-white/10 rounded">
          <div
            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-75"
            style={{ width: `${progress}%`, boxShadow: "0 0 10px oklch(0.72 0.18 44 / 0.6)" }}
          />
        </div>

        {/* Log feed */}
        <div
          ref={logsRef}
          className="h-10 text-[10px] uppercase tracking-wider text-white/50 overflow-hidden text-center truncate"
        >
          {currentLog}
        </div>
      </div>

      {/* Cinematic Audio Selection Screen on Load Completion */}
      {isFinished && (
        <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md text-center border border-orange-500/20 bg-black/60 rounded-3xl p-10 backdrop-blur-xl max-sm:mx-4 animate-scale-up">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/30 mb-6 brand-glow">
              <Radio className="h-6 w-6 text-orange-500 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-white mb-2 font-sans">
              ESTABLISH COMMAND SYSTEM LINK
            </h2>
            <p className="text-xs text-white/40 mb-8 font-sans leading-relaxed">
              Connect to RescueOS terminal. Select audio profile for ambient sound synthesis and telemetry status cues.
            </p>

            <div className="flex flex-col gap-3 font-sans">
              <button
                onClick={() => handleEnter(true)}
                className="enter-hud-btn w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-orange-500/10 py-3.5 text-xs font-bold uppercase tracking-wider text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-300 cursor-pointer"
              >
                <Volume2 className="h-4 w-4" /> Enter with Telemetry Sound
              </button>
              
              <button
                onClick={() => handleEnter(false)}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer"
              >
                <VolumeX className="h-4 w-4" /> Enter Silent Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
