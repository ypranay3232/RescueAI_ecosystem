"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Bell, CloudRain, Wifi, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  alerts?: { id: string; text: string; level: "warning" | "critical" | "info" }[];
}

const DEFAULT_ALERTS = [
  { id: "a1", text: "Storm ETA 18 min — reduce drone ops", level: "warning" as const },
  { id: "a2", text: "Signal lost on FL-2247",            level: "critical" as const },
];

export function AppHeader({
  title,
  subtitle,
  alerts = DEFAULT_ALERTS,
}: AppHeaderProps) {
  const headerRef    = useRef<HTMLElement>(null);
  const titleRef     = useRef<HTMLHeadingElement>(null);
  const alertRef     = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState("");
  const [alertIdx, setAlertIdx] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  // Live clock
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Rotate alerts every 4 s
  useEffect(() => {
    if (alerts.length <= 1) return;
    const id = setInterval(() => setAlertIdx((p) => (p + 1) % alerts.length), 4000);
    return () => clearInterval(id);
  }, [alerts.length]);

  // Animate alert text swap
  useEffect(() => {
    if (!alertRef.current) return;
    gsap.fromTo(alertRef.current,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
    );
  }, [alertIdx]);

  // Header entrance
  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(headerRef.current,
      { y: -10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", delay: 0.05 }
    );
    if (titleRef.current) {
      gsap.fromTo(titleRef.current,
        { x: -12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", delay: 0.15 }
      );
    }
  }, []);

  const currentAlert = alerts[alertIdx];
  const alertColor = currentAlert?.level === "critical" ? "#ef4444"
    : currentAlert?.level === "warning" ? "#f97316" : "#3b82f6";

  return (
    <header
      ref={headerRef}
      className="relative z-20 flex items-center justify-between gap-4 px-6 py-0"
      style={{
        height: 64,
        background: "oklch(0.10 0.014 265 / 0.90)",
        borderBottom: "1px solid oklch(1 0 0 / 0.07)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Left — title */}
      <div ref={titleRef} className="min-w-0">
        <div className="flex items-center gap-2.5">
          <div
            className="h-6 w-0.5 rounded-full flex-shrink-0"
            style={{ background: "linear-gradient(to bottom, oklch(0.85 0.18 44), oklch(0.72 0.18 44 / 0.3))" }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[11px]" style={{ color: "oklch(1 0 0 / 0.4)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Center — scrolling alert ticker */}
      {alerts.length > 0 && (
        <div
          className="hidden md:flex flex-1 max-w-md items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
          style={{
            background: `${alertColor}0f`,
            border: `1px solid ${alertColor}33`,
          }}
          onClick={() => setShowAlerts((v) => !v)}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: alertColor }} />
          <div ref={alertRef} className="flex-1 min-w-0">
            <p className="truncate text-[11px] font-medium" style={{ color: alertColor }}>
              {currentAlert?.text}
            </p>
          </div>
          {alerts.length > 1 && (
            <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold"
              style={{ background: `${alertColor}22`, color: alertColor }}>
              {alertIdx + 1}/{alerts.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-40" />
        </div>
      )}

      {/* Right — clock + status + bell */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Live clock */}
        <div
          className="hidden lg:flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: "oklch(0.14 0.014 265)",
            border: "1px solid oklch(1 0 0 / 0.06)",
          }}
        >
          <Clock className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.18 44)" }} />
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: "#f1f5f9" }}>
            {time}
          </span>
          <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 0.3)" }}>UTC</span>
        </div>

        {/* Network indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-2"
          style={{
            background: "oklch(0.14 0.014 265)",
            border: "1px solid oklch(1 0 0 / 0.06)",
          }}
        >
          <Wifi className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#22c55e" }}>LIVE</span>
        </div>

        {/* Bell with badge */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-xl p-0 transition-colors hover:bg-white/5"
            onClick={() => setShowAlerts((v) => !v)}
          >
            <Bell className="h-4 w-4" style={{ color: "oklch(1 0 0 / 0.6)" }} />
            {alerts.length > 0 && (
              <span
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {alerts.length}
              </span>
            )}
          </Button>

          {/* Alert dropdown */}
          {showAlerts && (
            <div
              className="absolute right-0 top-11 z-50 w-80 rounded-2xl p-1 shadow-2xl"
              style={{
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
              }}
            >
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "oklch(1 0 0 / 0.35)" }}>
                  Active Alerts
                </p>
                <button
                  className="text-[10px]"
                  style={{ color: "oklch(0.72 0.18 44)" }}
                  onClick={() => setShowAlerts(false)}
                >
                  Dismiss
                </button>
              </div>
              {alerts.map((a) => {
                const c = a.level === "critical" ? "#ef4444" : a.level === "warning" ? "#f97316" : "#3b82f6";
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 my-0.5"
                    style={{ background: `${c}0a`, border: `1px solid ${c}22` }}
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: c }} />
                    <p className="text-xs leading-snug" style={{ color: "oklch(0.85 0.006 265)" }}>{a.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
