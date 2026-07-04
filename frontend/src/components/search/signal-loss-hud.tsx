"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface LKP {
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  fuelRemaining: number;
  timestamp: string;
}

interface SignalLossHudProps {
  active: boolean;
  lkp?: LKP;
  onComplete?: () => void;
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%!?><+-=~";

function scramble(el: HTMLElement, finalText: string, duration = 1.2) {
  let frame = 0;
  const total = Math.ceil(duration * 60);
  const update = () => {
    frame++;
    const progress = frame / total;
    const revealed = Math.floor(progress * finalText.length);
    let text = finalText.slice(0, revealed);
    for (let i = revealed; i < finalText.length; i++) {
      text += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = text;
    if (frame < total) requestAnimationFrame(update);
    else el.textContent = finalText;
  };
  requestAnimationFrame(update);
}

export function SignalLossHud({ active, lkp, onComplete }: SignalLossHudProps) {
  const overlayRef   = useRef<HTMLDivElement>(null);
  const redFlashRef  = useRef<HTMLDivElement>(null);
  const scanRef      = useRef<HTMLDivElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);
  const latRef       = useRef<HTMLSpanElement>(null);
  const lngRef       = useRef<HTMLSpanElement>(null);
  const altRef       = useRef<HTMLSpanElement>(null);
  const spdRef       = useRef<HTMLSpanElement>(null);
  const hdgRef       = useRef<HTMLSpanElement>(null);
  const fuelRef      = useRef<HTMLSpanElement>(null);
  const statusRef    = useRef<HTMLSpanElement>(null);
  const timelineRef  = useRef<gsap.core.Timeline | null>(null);
  const didRunRef    = useRef(false);
  const [timestamp, setTimestamp] = useState("");

  useEffect(() => {
    setTimestamp(new Date().toISOString().slice(0, 19).replace("T", " "));
  }, []);

  useEffect(() => {
    if (!active || !overlayRef.current) return;
    if (didRunRef.current) return;
    didRunRef.current = true;

    const el = overlayRef.current;
    const tl = gsap.timeline({
      onComplete: () => {
        // Fade out and remove
        gsap.to(el, {
          opacity: 0, duration: 0.8, delay: 1.5,
          onComplete: () => {
            gsap.set(el, { display: "none" });
            didRunRef.current = false;
            onComplete?.();
          },
        });
      },
    });
    timelineRef.current = tl;

    // 1. Show overlay
    tl.set(el, { display: "flex", opacity: 0 });
    tl.to(el, { opacity: 1, duration: 0.1 });

    // 2. Red flash strobes - reduced intensity and duration
    if (redFlashRef.current) {
      tl.to(redFlashRef.current, {
        opacity: 0.25, duration: 0.05, yoyo: true, repeat: 3, ease: "none",
      }, "<");
      tl.to(redFlashRef.current, {
        opacity: 0, duration: 0.3, ease: "power2.out"
      }, ">+0.1");
    }

    // 3. Scan line sweep
    if (scanRef.current) {
      tl.fromTo(scanRef.current,
        { top: "-4px", opacity: 0.9 },
        { top: "100%", opacity: 0, duration: 0.7, ease: "none" },
        "<0.1"
      );
    }

    // 4. Panel slides in
    if (panelRef.current) {
      tl.fromTo(panelRef.current,
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0,  opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" },
        "-=0.3"
      );
    }

    // 5. Scramble each data field
    const delay = 0.08;
    if (lkp) {
      const fields: [React.RefObject<HTMLSpanElement | null>, string][] = [
        [latRef,  lkp.lat.toFixed(6)],
        [lngRef,  lkp.lng.toFixed(6)],
        [altRef,  `${lkp.altitude.toLocaleString()} FT`],
        [spdRef,  `${lkp.speed} KTS`],
        [hdgRef,  `${lkp.heading.toFixed(1)}°`],
        [fuelRef, `${lkp.fuelRemaining.toFixed(0)}%`],
      ];
      fields.forEach(([ref, val], i) => {
        tl.call(() => { if (ref.current) scramble(ref.current, val, 0.8); }, [], `>+${i === 0 ? 0 : delay}`);
      });
    }

    // 6. Status text blink
    if (statusRef.current) {
      tl.call(() => {
        if (!statusRef.current) return;
        scramble(statusRef.current, "SIGNAL LOST — INITIATING SEARCH PROTOCOL", 1.2);
      }, [], ">+0.1");
    }

    return () => { tl.kill(); };
  }, [active, lkp, onComplete]);

  // Reset when deactivated
  useEffect(() => {
    if (!active && overlayRef.current) {
      gsap.killTweensOf(overlayRef.current);
      gsap.set(overlayRef.current, { display: "none", opacity: 0 });
      didRunRef.current = false;
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    }
  }, [active]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] hidden items-center justify-center pointer-events-none"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      {/* Red flash layer - disabled */}
      {/* <div
        ref={redFlashRef}
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ background: "rgba(239,68,68,0.18)" }}
      /> */}

      {/* Scan line - changed to blue */}
      <div
        ref={scanRef}
        className="pointer-events-none absolute left-0 right-0 h-[3px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.85), transparent)",
          top: "-4px",
          boxShadow: "0 0 16px rgba(59,130,246,0.6)",
        }}
      />

      {/* Scanline overlay texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)",
        }}
      />

      {/* HUD Panel */}
      <div
        ref={panelRef}
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl opacity-0"
        style={{
          background: "rgba(10,8,12,0.95)",
          border: "1px solid rgba(59,130,246,0.35)",
          boxShadow: "0 0 60px rgba(59,130,246,0.2), inset 0 0 40px rgba(59,130,246,0.04)",
        }}
      >
        {/* Top alert bar */}
        <div
          className="flex items-center gap-3 border-b px-6 py-3"
          style={{ borderColor: "rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)" }}
        >
          <div className="status-dot status-dot-blue" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            EMERGENCY — Aircraft Signal Lost
          </span>
        </div>

        {/* LKP data grid */}
        <div className="grid grid-cols-3 gap-px p-0.5" style={{ background: "rgba(59,130,246,0.1)" }}>
          {[
            { label: "LATITUDE",   ref: latRef  },
            { label: "LONGITUDE",  ref: lngRef  },
            { label: "ALTITUDE",   ref: altRef  },
            { label: "SPEED",      ref: spdRef  },
            { label: "HEADING",    ref: hdgRef  },
            { label: "FUEL",       ref: fuelRef },
          ].map(({ label, ref }) => (
            <div key={label} className="flex flex-col gap-1 p-4" style={{ background: "rgba(10,8,12,0.96)" }}>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-500/70">
                {label}
              </span>
              <span ref={ref} className="font-mono text-sm font-bold text-blue-100">
                ------
              </span>
            </div>
          ))}
        </div>

        {/* Status line */}
        <div className="px-6 py-4">
          <span
            ref={statusRef}
            className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-400"
          >
            AWAITING DATA...
          </span>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between border-t px-6 py-3"
          style={{ borderColor: "rgba(59,130,246,0.15)" }}
        >
          <span className="font-mono text-[10px] text-blue-900/60">
            RescueOS AI · INCIDENT RESPONSE
          </span>
          <span className="font-mono text-[10px] text-blue-400">
            {timestamp} UTC
          </span>
        </div>
      </div>
    </div>
  );
}
