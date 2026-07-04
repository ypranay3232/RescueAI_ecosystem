"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  Brain, HeartPulse, LayoutDashboard, Plane, Radio, Truck,
  Wifi, Shield, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/mock-data";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard, Plane, Drone: Radio, HeartPulse, Brain, Truck,
};

const NAV_DESCRIPTIONS: Record<string, string> = {
  "/dashboard": "Live ops",
  "/search":    "Find & rescue",
  "/drones":    "UAV control",
  "/wearables": "Vitals",
  "/planner":   "AI tactics",
  "/resources": "Assets",
};

export function AppSidebar() {
  const pathname  = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const navRefs    = useRef<HTMLAnchorElement[]>([]);

  // GSAP entrance on mount
  useEffect(() => {
    if (!sidebarRef.current) return;
    const items = navRefs.current.filter(Boolean);

    gsap.set(sidebarRef.current, { x: -20, opacity: 0 });
    gsap.to(sidebarRef.current, {
      x: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.1,
    });

    gsap.set(items, { x: -14, opacity: 0 });
    gsap.to(items, {
      x: 0, opacity: 1, duration: 0.4, ease: "power3.out",
      stagger: 0.06, delay: 0.25,
    });
  }, []);

  // Pulse the active indicator dot when route changes
  useEffect(() => {
    const activeDot = sidebarRef.current?.querySelector(".active-dot");
    if (!activeDot) return;
    gsap.fromTo(activeDot,
      { scale: 0.4, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }
    );
  }, [pathname]);

  return (
    <aside
      ref={sidebarRef}
      className="relative flex w-64 shrink-0 flex-col overflow-hidden"
      style={{
        background: "oklch(0.10 0.014 265 / 0.95)",
        borderRight: "1px solid oklch(1 0 0 / 0.07)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      {/* Brand glow at top */}
      <div
        className="pointer-events-none absolute -top-20 left-8 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "oklch(0.72 0.18 44 / 0.12)" }}
      />

      {/* Logo */}
      <div
        className="relative z-10 flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.18 44 / 0.25), oklch(0.72 0.18 44 / 0.10))",
            border: "1.5px solid oklch(0.72 0.18 44 / 0.4)",
            boxShadow: "0 0 16px oklch(0.72 0.18 44 / 0.2)",
          }}
        >
          <Radio className="h-5 w-5" style={{ color: "oklch(0.85 0.18 44)" }} />
        </div>
        <div>
          <p
            className="font-bold tracking-tight text-sm"
            style={{ color: "#f1f5f9" }}
          >
            RescueOS AI
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: "oklch(0.72 0.18 44)" }}>
            Command Center
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 space-y-0.5 p-3 pt-4">
        <p className="mb-3 px-2 text-[9px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "oklch(1 0 0 / 0.22)" }}>
          Operations
        </p>

        {NAV_ITEMS.map((item, i) => {
          const Icon   = iconMap[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href;
          const desc   = NAV_DESCRIPTIONS[item.href] ?? "";

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => { if (el) navRefs.current[i] = el; }}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                active
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-100"
              )}
              style={active ? {
                background: "linear-gradient(135deg, oklch(0.72 0.18 44 / 0.18), oklch(0.72 0.18 44 / 0.08))",
                border: "1px solid oklch(0.72 0.18 44 / 0.3)",
                boxShadow: "0 0 12px oklch(0.72 0.18 44 / 0.12)",
              } : {
                border: "1px solid transparent",
              }}
            >
              {/* Hover background */}
              {!active && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: "oklch(1 0 0 / 0.04)" }}
                />
              )}

              {/* Icon */}
              <div
                className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200"
                style={active ? {
                  background: "oklch(0.72 0.18 44 / 0.25)",
                  boxShadow: "0 0 8px oklch(0.72 0.18 44 / 0.3)",
                } : {
                  background: "oklch(1 0 0 / 0.05)",
                }}
              >
                <Icon
                  className="h-4 w-4 transition-colors"
                  style={{ color: active ? "oklch(0.85 0.18 44)" : "inherit" }}
                />
              </div>

              {/* Label + desc */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                {desc && (
                  <p className="text-[10px] leading-tight"
                    style={{ color: active ? "oklch(0.72 0.18 44 / 0.7)" : "oklch(1 0 0 / 0.25)" }}>
                    {desc}
                  </p>
                )}
              </div>

              {/* Active indicator */}
              {active && (
                <div
                  className="active-dot h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: "oklch(0.72 0.18 44)", boxShadow: "0 0 6px oklch(0.72 0.18 44)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom status panel */}
      <div
        className="relative z-10 p-4 space-y-3"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        {/* System health */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: "oklch(0.12 0.014 265)",
            border: "1px solid oklch(1 0 0 / 0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "oklch(1 0 0 / 0.35)" }}>
              System Health
            </span>
            <div className="flex items-center gap-1.5">
              <div className="status-dot status-dot-green" />
              <span className="text-[10px] font-semibold" style={{ color: "#22c55e" }}>
                Operational
              </span>
            </div>
          </div>

          {[
            { icon: Wifi,     label: "Network",   ok: true  },
            { icon: Shield,   label: "Backend",   ok: true  },
            { icon: Activity, label: "AI Engine", ok: true  },
          ].map(({ icon: I, label, ok }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <I className="h-3 w-3" style={{ color: "oklch(1 0 0 / 0.3)" }} />
                <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 0.4)" }}>{label}</span>
              </div>
              <div className={ok ? "status-dot status-dot-green" : "status-dot status-dot-red"}
                style={{ width: 6, height: 6 }} />
            </div>
          ))}
        </div>

        {/* Version */}
        <p className="text-center text-[9px]" style={{ color: "oklch(1 0 0 / 0.18)" }}>
          RescueOS v2.0 · RescueAI ecosystem
        </p>
      </div>
    </aside>
  );
}
