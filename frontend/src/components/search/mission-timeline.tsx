"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Plane, Radio, MapPin, AlertTriangle, Search, Shield, CheckCircle2, Clock } from "lucide-react";

export type EventType =
  | "flight_start"
  | "in_flight"
  | "signal_lost"
  | "search_initiated"
  | "ai_analysis"
  | "services_alerted"
  | "ping_sent"
  | "zone_calculated"
  | "weather_update"
  | "elevation_data";

export interface TimelineEvent {
  id: string;
  type: EventType;
  label: string;
  detail?: string;
  timestamp: Date;
  status?: "active" | "done" | "warning";
}

const EVENT_META: Record<EventType, { icon: React.ElementType; color: string; bg: string }> = {
  flight_start:     { icon: Plane,         color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  in_flight:        { icon: Plane,         color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  signal_lost:      { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.15)"  },
  search_initiated: { icon: Search,        color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  ai_analysis:      { icon: Radio,         color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  zone_calculated:  { icon: MapPin,        color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  services_alerted: { icon: Shield,        color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  ping_sent:        { icon: CheckCircle2,  color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  weather_update:   { icon: Clock,         color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  elevation_data:   { icon: MapPin,        color: "#a3e635", bg: "rgba(163,230,53,0.12)" },
};

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  index: number;
}

function TimelineItem({ event, isLast, index }: TimelineItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  const isSignalLost = event.type === "signal_lost";

  useEffect(() => {
    if (!itemRef.current) return;
    gsap.fromTo(
      itemRef.current,
      { opacity: 0, x: -20 },
      {
        opacity: 1, x: 0,
        duration: 0.5,
        delay: index * 0.08,
        ease: "power3.out",
      }
    );
  }, [index]);

  return (
    <div ref={itemRef} className="relative flex gap-3 opacity-0">
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute left-[17px] top-10 bottom-0 w-px"
          style={{ background: isSignalLost ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)" }}
        />
      )}

      {/* Icon bubble */}
      <div
        className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          background: meta.bg,
          border: `1.5px solid ${meta.color}44`,
          boxShadow: isSignalLost ? `0 0 14px ${meta.color}44` : undefined,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 pt-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-semibold leading-tight"
            style={{ color: isSignalLost ? "#ef4444" : "#f1f5f9" }}
          >
            {event.label}
          </p>
          <span
            className="flex-shrink-0 font-mono text-[10px]"
            style={{ color: meta.color + "99" }}
          >
            {formatTime(event.timestamp)}
          </span>
        </div>
        {event.detail && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#64748b" }}>
            {event.detail}
          </p>
        )}
        {event.status === "active" && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="status-dot status-dot-orange" style={{ width: 6, height: 6 }} />
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "oklch(0.72 0.18 44)" }}>
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MissionTimelineProps {
  events: TimelineEvent[];
  className?: string;
  maxHeight?: string;
}

export function MissionTimeline({ events, className = "", maxHeight = "420px" }: MissionTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" style={{ color: "oklch(0.72 0.18 44)" }} />
        <span className="text-sm font-semibold">Mission Timeline</span>
        <span
          className="ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
          style={{ background: "rgba(249,115,22,0.15)", color: "oklch(0.72 0.18 44)" }}
        >
          {events.length} events
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
          <Clock className="h-8 w-8" />
          <p className="text-xs text-muted-foreground">Events appear as the mission progresses</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-y-auto pr-1"
          style={{ maxHeight }}
        >
          {events.map((event, i) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={i === events.length - 1}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
