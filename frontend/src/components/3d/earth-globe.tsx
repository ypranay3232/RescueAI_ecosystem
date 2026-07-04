// @ts-nocheck
"use client";

/// <reference types="@react-three/fiber" />
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ThreeElements } from "@react-three/fiber";
import { useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Stars, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Convert lat/lng (degrees) to a 3D point on a unit sphere of radius r */
function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/** Generate an arc of points between two lat/lng positions (great-circle) */
function buildArc(
  startLat: number, startLng: number,
  endLat:   number, endLng:   number,
  segments = 80,
  altitude = 0.22
): THREE.Vector3[] {
  const start = latLngToVec3(startLat, startLng, 1);
  const end   = latLngToVec3(endLat,   endLng,   1);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t   = i / segments;
    const mid = new THREE.Vector3().lerpVectors(start, end, t);
    // lift midpoint for arc height
    const height = 1 + altitude * Math.sin(Math.PI * t);
    mid.normalize().multiplyScalar(height);
    points.push(mid);
  }
  return points;
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface GlobeProps {
  startLat?: number;
  startLng?: number;
  endLat?:   number;
  endLng?:   number;
  crashLat?: number;
  crashLng?: number;
  flightProgress: number; // 0-1
  signalLost: boolean;
  onCrashZoomDone?: () => void;
}

function GlobeScene({
  startLat = 40.641, startLng = -73.778,
  endLat   = 51.477, endLng  = -0.461,
  crashLat, crashLng,
  flightProgress,
  signalLost,
  onCrashZoomDone,
}: GlobeProps) {
  const globeRef    = useRef<THREE.Mesh>(null);
  const atmRef      = useRef<THREE.Mesh>(null);
  const planeRef    = useRef<THREE.Mesh>(null);
  const crashRef    = useRef<THREE.Mesh>(null);
  const groupRef    = useRef<THREE.Group>(null);
  const { camera }  = useThree();

  const arcPoints = useMemo(
    () => buildArc(startLat, startLng, endLat, endLng),
    [startLat, startLng, endLat, endLng]
  );

  // Crash position
  const crashPos = useMemo(() => {
    if (crashLat != null && crashLng != null)
      return latLngToVec3(crashLat, crashLng, 1.015);
    return null;
  }, [crashLat, crashLng]);

  // Plane position along arc
  const planePos = useMemo(() => {
    const idx = Math.min(
      Math.floor(flightProgress * (arcPoints.length - 1)),
      arcPoints.length - 1
    );
    return arcPoints[idx];
  }, [flightProgress, arcPoints]);

  // Auto-rotate globe
  useFrame((_, delta) => {
    if (!globeRef.current || signalLost) return;
    globeRef.current.rotation.y += delta * 0.06;
    if (atmRef.current) atmRef.current.rotation.y += delta * 0.06;
  });

  // Pulse crash marker
  useFrame(({ clock }) => {
    if (!crashRef.current) return;
    const s = 1 + 0.3 * Math.sin(clock.getElapsedTime() * 4);
    crashRef.current.scale.setScalar(s);
  });

  // Camera zoom-in to crash site on signal loss
  useEffect(() => {
    if (!signalLost || !crashLat || !crashLng) return;
    const target = latLngToVec3(crashLat, crashLng, 2.8);

    gsap.to(camera.position, {
      x: target.x, y: target.y, z: target.z,
      duration: 2.4,
      ease: "power3.inOut",
      onComplete: () => onCrashZoomDone?.(),
    });
    gsap.to(camera, { fov: 38, duration: 2.4, ease: "power3.inOut",
      onUpdate: () => (camera as THREE.PerspectiveCamera).updateProjectionMatrix() });
  }, [signalLost, crashLat, crashLng, camera, onCrashZoomDone]);

  // Reset camera when not lost
  useEffect(() => {
    if (signalLost) return;
    gsap.to(camera.position, { x: 0, y: 0.4, z: 2.8, duration: 1.6, ease: "power2.inOut" });
    gsap.to(camera, { fov: 55, duration: 1.6, ease: "power2.inOut",
      onUpdate: () => (camera as THREE.PerspectiveCamera).updateProjectionMatrix() });
  }, [signalLost, camera]);

  return (
    <group ref={groupRef}>
      {/* Stars background */}
      <Stars radius={100} depth={60} count={4000} factor={3} saturation={0} fade speed={0.4} />

      {/* Atmosphere glow */}
      <Sphere ref={atmRef} args={[1.06, 64, 64]}>
        <meshStandardMaterial
          color="#1a4080"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>

      {/* Earth sphere */}
      <Sphere ref={globeRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#0d2340"
          roughness={0.8}
          metalness={0.1}
        />
      </Sphere>

      {/* Continent dots overlay — procedural */}
      <ContinentDots />

      {/* Flight arc */}
      {arcPoints.length > 1 && (
        <Line
          points={arcPoints}
          color={signalLost ? "#ef4444" : "#f97316"}
          lineWidth={signalLost ? 1.5 : 2.5}
          dashed={signalLost}
          dashSize={0.04}
          gapSize={0.03}
          transparent
          opacity={signalLost ? 0.5 : 0.85}
        />
      )}

      {/* Departure marker */}
      <mesh position={latLngToVec3(startLat, startLng, 1.015)}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
      </mesh>

      {/* Destination marker */}
      <mesh position={latLngToVec3(endLat, endLng, 1.015)}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1} />
      </mesh>

      {/* Plane dot */}
      {flightProgress > 0 && flightProgress < 1 && (
        <mesh position={planePos}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#f97316"
            emissiveIntensity={2}
          />
        </mesh>
      )}

      {/* Crash marker */}
      {crashPos && signalLost && (
        <>
          <mesh ref={crashRef} position={crashPos}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
          </mesh>
          {/* Ring around crash */}
          <mesh position={crashPos} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.035, 0.042, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <Html position={crashPos} distanceFactor={4} center>
            <div className="pointer-events-none -translate-y-6 whitespace-nowrap rounded bg-red-900/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-300 backdrop-blur border border-red-500/40">
              LKP
            </div>
          </Html>
        </>
      )}

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 3, 4]} intensity={1.4} color="#ffd6a0" />
      <pointLight position={[-4, -2, -4]} intensity={0.3} color="#3060c0" />
    </group>
  );
}

/** Procedural continent-style dots on the globe surface */
function ContinentDots() {
  const points = useMemo(() => {
    // Seed-based pseudo-random land distribution
    const pts: THREE.Vector3[] = [];
    const rng = (n: number) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
    for (let i = 0; i < 3200; i++) {
      const lat = (rng(i * 2)     * 180) - 90;
      const lng = (rng(i * 2 + 1) * 360) - 180;
      // Rough land mask (very approximate)
      const isLand =
        // Americas
        (lng > -170 && lng < -30 && lat > -60 && lat < 80) ||
        // Europe / Africa
        (lng > -20 && lng < 60 && lat > -40 && lat < 75) ||
        // Asia
        (lng > 25 && lng < 150 && lat > 0 && lat < 75) ||
        // Australia
        (lng > 110 && lng < 155 && lat > -45 && lat < -10);
      if (!isLand) continue;
      pts.push(latLngToVec3(lat, lng, 1.004));
    }
    return pts;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => { arr[i*3]=p.x; arr[i*3+1]=p.y; arr[i*3+2]=p.z; });
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [points]);

  return (
    <points geometry={geo}>
      <pointsMaterial color="#2a6fa8" size={0.006} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

// ─── exported wrapper ─────────────────────────────────────────────────────────

export interface EarthGlobeProps extends GlobeProps {
  className?: string;
  height?: string;
}

export function EarthGlobe({ className = "", height = "400px", ...props }: EarthGlobeProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{ height }}>
      {/* Vignette overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, oklch(0.08 0.012 265) 100%)" }}
      />
      <Canvas
        camera={{ position: [0, 0.4, 2.8], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <GlobeScene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
