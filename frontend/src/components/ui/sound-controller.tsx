"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { gsap } from "gsap";

interface SoundControllerProps {
  enabled: boolean;
}

export function SoundController({ enabled }: SoundControllerProps) {
  const [isMuted, setIsMuted] = useState(!enabled);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Drone oscillators and gain nodes
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const subOscRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Initialize Audio Nodes
  const initAudio = () => {
    if (audioCtxRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // 1. Core deep hum (Sawtooth filtered)
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      droneOscRef.current = osc;

      // 2. Sub sine wave (Grounds the sound)
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(27.5, ctx.currentTime); // A0 note
      subOscRef.current = sub;

      // 3. Low Pass Filter (Removes harsh harmonics, keeps it moody and dark)
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(110, ctx.currentTime);
      filterRef.current = filter;

      // 4. Main Drone Gain Node
      const gain = ctx.createGain();
      // Start muted if isMuted is true, otherwise comfortable background hum level
      gain.gain.setValueAtTime(isMuted ? 0.0001 : 0.06, ctx.currentTime);
      droneGainRef.current = gain;

      // Wire nodes
      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      // Start drone oscillators
      osc.start(0);
      sub.start(0);
    } catch (e) {
      console.warn("Failed to initialize Web Audio Engine: ", e);
    }
  };

  // Telemetry Radar ping synth
  const playTelemetryPing = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || isMuted || ctx.state === "suspended") return;

    try {
      const now = ctx.currentTime;

      // Telemetry beep
      const pingOsc = ctx.createOscillator();
      pingOsc.type = "sine";
      pingOsc.frequency.setValueAtTime(680, now);
      // Sweeps down to simulate radar echo
      pingOsc.frequency.exponentialRampToValueAtTime(150, now + 1.4);

      // Ping Envelope
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.04, now);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      // Delay Echo Node
      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(0.24, now);

      const delayGain = ctx.createGain();
      delayGain.gain.setValueAtTime(0.015, now);

      // Wire ping paths
      pingOsc.connect(pingGain);
      pingGain.connect(ctx.destination);

      // Wire delay echo feedback loop
      pingGain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(ctx.destination);

      // Trigger oscillator
      pingOsc.start(now);
      pingOsc.stop(now + 1.5);
    } catch (e) {
      // Audio trigger skipped
    }
  };

  // Manage mute/unmute state changes
  useEffect(() => {
    if (enabled && !isMuted) {
      initAudio();
      
      // Resume context if suspended by browser security
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      if (droneGainRef.current && audioCtxRef.current) {
        droneGainRef.current.gain.exponentialRampToValueAtTime(0.06, audioCtxRef.current.currentTime + 0.3);
      }
    } else {
      if (droneGainRef.current && audioCtxRef.current) {
        droneGainRef.current.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.3);
      }
    }
  }, [isMuted, enabled]);

  // Periodic Telemetry Ping loops (runs every 5.5s)
  useEffect(() => {
    if (isMuted || !enabled) return;

    const interval = setInterval(() => {
      playTelemetryPing();
      
      // Small pulse on page elements during ping
      gsap.fromTo(
        ".sonar-indicator",
        { boxShadow: "0 0 0px oklch(0.72 0.18 44 / 0)", scale: 1 },
        { boxShadow: "0 0 16px oklch(0.72 0.18 44 / 0.4)", scale: 1.05, duration: 0.6, yoyo: true, repeat: 1 }
      );
    }, 5500);

    // Initial ping
    const initialTimeout = setTimeout(() => {
      playTelemetryPing();
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isMuted, enabled]);

  // Clean up nodes on unmount
  useEffect(() => {
    return () => {
      if (droneOscRef.current) droneOscRef.current.stop();
      if (subOscRef.current) subOscRef.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      {/* Sound waves animation indicators */}
      {!isMuted && enabled && (
        <div className="flex items-end gap-0.5 h-4 px-2 select-none pointer-events-none opacity-40">
          <span className="w-0.5 bg-orange-500 rounded-full animate-sound-bar-1 h-3" />
          <span className="w-0.5 bg-orange-500 rounded-full animate-sound-bar-2 h-4" />
          <span className="w-0.5 bg-orange-500 rounded-full animate-sound-bar-3 h-2" />
          <span className="w-0.5 bg-orange-500 rounded-full animate-sound-bar-4 h-3.5" />
        </div>
      )}
      
      {/* HUD Floating toggle */}
      <button
        onClick={toggleMute}
        className="flex h-11 w-11 items-center justify-center rounded-full glass-panel border border-white/10 text-white/70 hover:text-orange-500 hover:border-orange-500/30 hover:scale-105 transition-all duration-300 clickable cursor-pointer"
        title={isMuted ? "Unmute Telemetry Sounds" : "Mute Telemetry Sounds"}
      >
        {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5 text-orange-500 sonar-indicator" />}
      </button>
    </div>
  );
}
