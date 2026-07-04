"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface EarthGlobeProps {
  className?: string;
  height?: string;
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

export function EarthGlobe({
  className = "",
  height = "400px",
  startLat = 40.641, startLng = -73.778,
  endLat   = 51.477, endLng  = -0.461,
  crashLat, crashLng,
  flightProgress,
  signalLost,
  onCrashZoomDone
}: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Refs to share updates with the animation loop
  const propsRef = useRef({ flightProgress, signalLost, crashLat, crashLng });
  useEffect(() => {
    propsRef.current = { flightProgress, signalLost, crashLat, crashLng };
  }, [flightProgress, signalLost, crashLat, crashLng]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const heightVal = container.clientHeight || 400;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(55, width / heightVal, 0.1, 1000);
    const initialCamPos = new THREE.Vector3(0, 0.4, 2.8);
    camera.position.copy(initialCamPos);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightVal);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Globe and objects creation
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0d2340,
      roughness: 0.8,
      metalness: 0.1,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earth);

    // Atmosphere Glow Mesh
    const atmGeo = new THREE.SphereGeometry(1.06, 62, 62);
    const atmMat = new THREE.MeshStandardMaterial({
      color: 0x1a4080,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atm = new THREE.Mesh(atmGeo, atmMat);
    globeGroup.add(atm);

    // Procedural Continent Dots
    const ptCount = 2000;
    const ptGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(ptCount * 3);
    const rng = (n: number) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
    let validCount = 0;

    for (let i = 0; i < 3200 && validCount < ptCount; i++) {
      const lat = (rng(i * 2)     * 180) - 90;
      const lng = (rng(i * 2 + 1) * 360) - 180;
      // Land masking approximation
      const isLand =
        (lng > -170 && lng < -30 && lat > -60 && lat < 80) ||
        (lng > -20 && lng < 60 && lat > -40 && lat < 75) ||
        (lng > 25 && lng < 150 && lat > 0 && lat < 75) ||
        (lng > 110 && lng < 155 && lat > -45 && lat < -10);

      if (isLand) {
        const v = latLngToVec3(lat, lng, 1.004);
        positions[validCount * 3]     = v.x;
        positions[validCount * 3 + 1] = v.y;
        positions[validCount * 3 + 2] = v.z;
        validCount++;
      }
    }

    ptGeo.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, validCount * 3), 3));
    const ptMat = new THREE.PointsMaterial({
      color: 0x2a6fa8,
      size: 0.007,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    const pts = new THREE.Points(ptGeo, ptMat);
    globeGroup.add(pts);

    // Departure and Destination markers
    const startPos = latLngToVec3(startLat, startLng, 1.015);
    const startMarkerGeo = new THREE.SphereGeometry(0.014, 8, 8);
    const startMarkerMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 });
    const startMarker = new THREE.Mesh(startMarkerGeo, startMarkerMat);
    startMarker.position.copy(startPos);
    globeGroup.add(startMarker);

    const endPos = latLngToVec3(endLat, endLng, 1.015);
    const endMarkerGeo = new THREE.SphereGeometry(0.014, 8, 8);
    const endMarkerMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, emissive: 0x6366f1, emissiveIntensity: 1 });
    const endMarker = new THREE.Mesh(endMarkerGeo, endMarkerMat);
    endMarker.position.copy(endPos);
    globeGroup.add(endMarker);

    // Flight Arc Path
    const arcPoints = buildArc(startLat, startLng, endLat, endLng);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
    });
    const flightLine = new THREE.Line(lineGeo, lineMat);
    globeGroup.add(flightLine);

    // Plane Marker
    const planeGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 2 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    globeGroup.add(plane);

    // Crash LKP Marker (hidden initially)
    const crashGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const crashMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 3 });
    const crash = new THREE.Mesh(crashGeo, crashMat);
    crash.visible = false;
    globeGroup.add(crash);

    // Crash Ring Indicator
    const ringGeo = new THREE.RingGeometry(0.035, 0.042, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const crashRing = new THREE.Mesh(ringGeo, ringMat);
    crashRing.visible = false;
    globeGroup.add(crashRing);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd6a0, 1.4);
    dirLight.position.set(4, 3, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3060c0, 0.6);
    pointLight.position.set(-4, -2, -4);
    scene.add(pointLight);

    // 6. Animation parameters and loop
    let animationId = 0;
    const clock = new THREE.Clock();
    
    // Zoom targets
    let isZoomDoneCalled = false;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const { flightProgress: progressVal, signalLost: lostVal, crashLat: cLat, crashLng: cLng } = propsRef.current;

      // 1. Globe auto-rotation
      if (!lostVal) {
        globeGroup.rotation.y += delta * 0.08;
        isZoomDoneCalled = false;
      }

      // 2. Set flight line style/color
      if (lostVal) {
        lineMat.color.setHex(0xef4444);
        lineMat.opacity = 0.55;
      } else {
        lineMat.color.setHex(0xf97316);
        lineMat.opacity = 0.85;
      }

      // 3. Move Plane dot
      if (progressVal > 0 && progressVal < 1) {
        const idx = Math.min(
          Math.floor(progressVal * (arcPoints.length - 1)),
          arcPoints.length - 1
        );
        plane.position.copy(arcPoints[idx]);
        plane.visible = !lostVal;
      } else {
        plane.visible = false;
      }

      // 4. Update Crash LKP markers
      if (lostVal && cLat != null && cLng != null) {
        const cPos = latLngToVec3(cLat, cLng, 1.015);
        
        crash.position.copy(cPos);
        crash.visible = true;
        // pulse scale
        const scaleVal = 1 + 0.3 * Math.sin(elapsed * 5);
        crash.scale.setScalar(scaleVal);

        crashRing.position.copy(cPos);
        crashRing.visible = true;
        
        // Orient ring to surface normal
        const normal = cPos.clone().normalize();
        crashRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      } else {
        crash.visible = false;
        crashRing.visible = false;
      }

      // 5. Camera Interpolation (Zoom)
      if (lostVal && cLat != null && cLng != null) {
        // Calculate dynamic global coordinates of crash site (taking globe rotation into account)
        const localPos = latLngToVec3(cLat, cLng, 2.3);
        const globalPos = localPos.clone().applyMatrix4(globeGroup.matrixWorld);

        // Lerp camera to target
        camera.position.lerp(globalPos, 0.05);
        camera.lookAt(earth.position);

        if (camera.position.distanceTo(globalPos) < 0.1 && !isZoomDoneCalled) {
          isZoomDoneCalled = true;
          onCrashZoomDone?.();
        }
      } else {
        // Return to default angle
        camera.position.lerp(initialCamPos, 0.05);
        camera.lookAt(earth.position);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [startLat, startLng, endLat, endLng]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{ height }}>
      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, oklch(0.08 0.012 265) 100%)" }}
      />
      <div ref={mountRef} className="w-full h-full" style={{ background: "transparent" }} />
    </div>
  );
}
