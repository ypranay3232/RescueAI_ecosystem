// @ts-nocheck
"use client";

/// <reference types="@react-three/fiber" />
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ThreeElements } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import * as THREE from "three";

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 300;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sizes[i] = Math.random() * 0.04 + 0.01;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.012;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.008) * 0.06;
    }
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#f97316" size={0.025} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

function OrbRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.08;
      ref.current.rotation.x = 1.2 + Math.sin(clock.getElapsedTime() * 0.05) * 0.1;
    }
  });
  return (
    <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={ref}>
        <torusGeometry args={[2.6, 0.006, 8, 120]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.18} />
      </mesh>
      <mesh>
        <torusGeometry args={[3.8, 0.004, 8, 120]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.10} />
      </mesh>
    </Float>
  );
}

export function Starfield() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <Stars radius={80} depth={50} count={6000} factor={2.5} saturation={0.1} fade speed={0.3} />
        <FloatingParticles />
        <OrbRing />
        <ambientLight intensity={0.5} />
      </Suspense>
    </Canvas>
  );
}
