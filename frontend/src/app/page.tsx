"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, Brain, Map, Radio, Shield,
  Plane, Zap, Globe, Target, Activity, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

const Starfield = dynamic(
  () => import("@/components/3d/starfield").then((m) => m.Starfield),
  { ssr: false }
);

const FEATURES = [
  {
    icon: Map,
    color: "#f97316",
    title: "Real-Time Search Mapping",
    desc: "AI-estimated crash zones, OSRM road routing to nearest hospitals, police, and fire stations — on live OpenStreetMap data.",
  },
  {
    icon: Brain,
    color: "#a855f7",
    title: "AI Rescue Planner",
    desc: "Gemini & GPT-powered search zone prediction and prioritized action recommendations with real road ETAs.",
  },
  {
    icon: Globe,
    color: "#3b82f6",
    title: "3D Mission Globe",
    desc: "Three.js Earth visualization with great-circle flight arcs, atmospheric glow, and GSAP crash-site zoom cinematic.",
  },
  {
    icon: Shield,
    color: "#ec4899",
    title: "Emergency Services Overlay",
    desc: "Live Overpass API data — hospitals, police stations, fire stations — with clickable ping-to-dispatch alerts.",
  },
  {
    icon: Activity,
    color: "#22c55e",
    title: "GSAP Signal-Loss HUD",
    desc: "Cinematic signal-loss sequence with coordinate-scramble animation, scanlines, and a red-alert flash.",
  },
  {
    icon: Target,
    color: "#f97316",
    title: "Multi-Tile Map Intelligence",
    desc: "Switch between dark, satellite, terrain, and light map tiles. Animated route polylines with real road routing.",
  },
];

const STATS = [
  { value: "180+",  label: "Airports",          icon: Plane   },
  { value: "4",     label: "Map tile styles",    icon: Map     },
  { value: "< 3s",  label: "AI analysis",        icon: Zap     },
  { value: "30km",  label: "Services search radius", icon: Globe },
];

export default function LandingPage() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const badgeRef  = useRef<HTMLParagraphElement>(null);
  const h1Ref     = useRef<HTMLHeadingElement>(null);
  const subRef    = useRef<HTMLParagraphElement>(null);
  const ctaRef    = useRef<HTMLDivElement>(null);
  const statsRef  = useRef<HTMLDivElement>(null);
  const cardsRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero entrance
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(badgeRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
    )
    .fromTo(h1Ref.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
      "-=0.25"
    )
    .fromTo(subRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
      "-=0.3"
    )
    .fromTo(ctaRef.current,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
      "-=0.25"
    );

    // Stats scroll-in
    if (statsRef.current) {
      gsap.fromTo(
        statsRef.current.querySelectorAll(".stat-item"),
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: statsRef.current, start: "top 85%" },
        }
      );
    }

    // Feature cards scroll-in
    if (cardsRef.current) {
      gsap.fromTo(
        cardsRef.current.querySelectorAll(".feature-card"),
        { y: 40, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.55, stagger: 0.08, ease: "power3.out",
          scrollTrigger: { trigger: cardsRef.current, start: "top 80%" },
        }
      );
    }

    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, []);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "oklch(0.08 0.012 265)" }}
    >
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col">
        {/* Three.js starfield - temporarily disabled due to React version conflicts */}
        {/* <Starfield /> */}

        {/* Gradient overlays */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.72 0.18 44 / 0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-48"
          style={{ background: "linear-gradient(to top, oklch(0.08 0.012 265), transparent)" }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.72 0.18 44 / 0.25), oklch(0.72 0.18 44 / 0.08))",
                border: "1.5px solid oklch(0.72 0.18 44 / 0.4)",
                boxShadow: "0 0 16px oklch(0.72 0.18 44 / 0.2)",
              }}
            >
              <Radio className="h-4.5 w-4.5" style={{ color: "oklch(0.85 0.18 44)" }} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm" style={{ color: "#f1f5f9" }}>
                RescueOS AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: "oklch(0.12 0.014 265)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <div className="status-dot status-dot-green" style={{ width: 6, height: 6 }} />
              <span className="text-[11px] font-medium" style={{ color: "#22c55e" }}>Systems Live</span>
            </div>
            <Link href="/dashboard">
              <Button
                size="sm"
                className="rounded-xl font-semibold"
                style={{
                  background: "linear-gradient(135deg, oklch(0.72 0.18 44), oklch(0.62 0.22 30))",
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 0 20px oklch(0.72 0.18 44 / 0.3)",
                }}
              >
                Open Dashboard
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p
            ref={badgeRef}
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "oklch(0.72 0.18 44 / 0.12)",
              border: "1px solid oklch(0.72 0.18 44 / 0.3)",
              color: "oklch(0.85 0.18 44)",
            }}
          >
            <span className="status-dot status-dot-orange" style={{ width: 6, height: 6 }} />
            Aircraft Search & Rescue · 2026
          </p>

          <h1
            ref={h1Ref}
            className="max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl"
            style={{ lineHeight: 1.08, color: "#f1f5f9" }}
          >
            AI-Powered
            <br />
            <span className="text-gradient-brand">Emergency Command</span>
          </h1>

          <p
            ref={subRef}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed"
            style={{ color: "oklch(1 0 0 / 0.5)" }}
          >
            Real-time aircraft tracking, 3D globe visualization, live emergency services routing,
            and AI-driven rescue planning — all from a single command center.
          </p>

          <div ref={ctaRef} className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/search">
              <Button
                size="lg"
                className="gap-2 rounded-2xl px-8 font-bold text-base"
                style={{
                  background: "linear-gradient(135deg, oklch(0.72 0.18 44), oklch(0.62 0.22 30))",
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 0 30px oklch(0.72 0.18 44 / 0.35), 0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                Launch Aircraft Search
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-2xl px-8 font-semibold text-base"
                style={{
                  background: "oklch(0.12 0.014 265 / 0.8)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  color: "oklch(0.9 0.006 265)",
                  backdropFilter: "blur(12px)",
                }}
              >
                Command Center
              </Button>
            </Link>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(1 0 0 / 0.5)" }}>
              Scroll
            </span>
            <div
              className="h-8 w-px"
              style={{ background: "linear-gradient(to bottom, oklch(1 0 0 / 0.3), transparent)" }}
            />
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section ref={statsRef} className="relative py-16 px-6">
        <div
          className="mx-auto max-w-4xl grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {STATS.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="stat-item flex flex-col items-center gap-2 rounded-2xl p-6 text-center"
              style={{
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "oklch(0.72 0.18 44 / 0.12)", border: "1px solid oklch(0.72 0.18 44 / 0.2)" }}
              >
                <Icon className="h-5 w-5" style={{ color: "oklch(0.85 0.18 44)" }} />
              </div>
              <p className="text-3xl font-extrabold text-gradient-brand">{value}</p>
              <p className="text-xs" style={{ color: "oklch(1 0 0 / 0.4)" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="relative py-20 px-6">
        {/* Section heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "oklch(0.72 0.18 44)" }}>
            Platform Capabilities
          </p>
          <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: "#f1f5f9" }}>
            Everything an air rescue
            <br />
            <span className="text-gradient-brand">operation needs</span>
          </h2>
        </div>

        <div ref={cardsRef} className="mx-auto max-w-6xl grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="feature-card group relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
              style={{
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.07)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { y: -4, duration: 0.25, ease: "power2.out" });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { y: 0, duration: 0.25, ease: "power2.out" });
              }}
            >
              {/* Glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(ellipse at 30% 30%, ${color}0a, transparent 70%)` }}
              />
              {/* Top accent line */}
              <div
                className="absolute left-0 right-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }}
              />

              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${color}15`, border: `1.5px solid ${color}30` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>

              <h3 className="mb-2 font-bold text-sm" style={{ color: "#f1f5f9" }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(1 0 0 / 0.45)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div
          className="mx-auto max-w-3xl rounded-3xl p-10 text-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.14 0.014 265), oklch(0.11 0.012 265))",
            border: "1px solid oklch(0.72 0.18 44 / 0.2)",
            boxShadow: "0 0 60px oklch(0.72 0.18 44 / 0.08)",
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.18 44 / 0.25), oklch(0.72 0.18 44 / 0.08))",
              border: "1.5px solid oklch(0.72 0.18 44 / 0.4)",
              boxShadow: "0 0 24px oklch(0.72 0.18 44 / 0.3)",
            }}
          >
            <Lock className="h-7 w-7" style={{ color: "oklch(0.85 0.18 44)" }} />
          </div>
          <h2 className="text-3xl font-extrabold" style={{ color: "#f1f5f9" }}>
            Ready to respond?
          </h2>
          <p className="mt-3 text-base" style={{ color: "oklch(1 0 0 / 0.45)" }}>
            Launch the aircraft search module and run a full crash simulation with live
            emergency services, AI analysis, and 3D globe visualization.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/search">
              <Button
                size="lg"
                className="gap-2 rounded-2xl px-10 font-bold"
                style={{
                  background: "linear-gradient(135deg, oklch(0.72 0.18 44), oklch(0.62 0.22 30))",
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 0 28px oklch(0.72 0.18 44 / 0.35)",
                }}
              >
                <Plane className="h-4 w-4" />
                Launch Aircraft Search
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center"
        style={{ borderColor: "oklch(1 0 0 / 0.06)", color: "oklch(1 0 0 / 0.25)" }}>
        <p className="text-xs">
          RescueOS AI · Built with Next.js 16, Three.js, GSAP, Framer Motion · RescueAI ecosystem 2026
        </p>
      </footer>
    </div>
  );
}
