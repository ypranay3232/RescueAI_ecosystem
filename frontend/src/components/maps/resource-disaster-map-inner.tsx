"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type NecessityType = "shelter" | "food" | "water" | "volunteer";

export interface Necessity {
  id: string;
  type: NecessityType;
  name: string;
  lat: number;
  lng: number;
  qty?: string;
  contact?: string;
  distanceKm: number;
  roadDistanceKm?: number;
  etaMinutes?: number;
  routePolyline?: [number, number][];
}

export type DisasterType = "flood" | "wildfire" | "earthquake" | "chemical" | "hurricane";

export interface ResourceDisasterMapProps {
  center?: [number, number];
  zoom?: number;
  disasterType: DisasterType;
  disasterLocation: { lat: number; lng: number } | null;
  impactRadiusKm: number;
  necessities: Necessity[];
  tileStyle?: "dark" | "satellite" | "terrain" | "light";
  isSimulating?: boolean;
  dispatchedIds?: string[];
  onMapClick?: (lat: number, lng: number) => void;
  onSimulationTick?: (progress: number) => void;
}

const TILE_LAYERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles &copy; Esri — Source: Esri, USGS, NOAA",
    maxZoom: 19,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
    maxZoom: 19,
  },
} as const;

const NECESSITY_META: Record<
  NecessityType,
  { color: string; bg: string; emoji: string; label: string; routeColor: string }
> = {
  shelter: { color: "#10b981", bg: "#022c22", emoji: "🏠", label: "Evacuation Shelter", routeColor: "#10b981" },
  food: { color: "#f59e0b", bg: "#2d1a00", emoji: "🍱", label: "Food Embankment", routeColor: "#f59e0b" },
  water: { color: "#06b6d4", bg: "#082f49", emoji: "💧", label: "Water Point", routeColor: "#06b6d4" },
  volunteer: { color: "#f43f5e", bg: "#310413", emoji: "🙋", label: "Volunteer", routeColor: "#f43f5e" },
};

const DISASTER_META: Record<
  DisasterType,
  { color: string; bg: string; emoji: string; label: string }
> = {
  flood: { color: "#3b82f6", bg: "#000d1a", emoji: "🌊", label: "Flood Zone" },
  wildfire: { color: "#ef4444", bg: "#1a0000", emoji: "🔥", label: "Wildfire Perimeter" },
  earthquake: { color: "#f97316", bg: "#1a0800", emoji: "🌋", label: "Earthquake Epicenter" },
  chemical: { color: "#a855f7", bg: "#13001a", emoji: "⚠️", label: "Chemical Containment" },
  hurricane: { color: "#06b6d4", bg: "#00171a", emoji: "🌀", label: "Hurricane Track" },
};

const EXTRA_CSS = `
@keyframes markerDropIn {
  0%   { transform: translateY(-24px) scale(0.6); opacity: 0; }
  70%  { transform: translateY(4px) scale(1.08);  opacity: 1; }
  100% { transform: translateY(0)   scale(1);     opacity: 1; }
}
@keyframes pulseZone {
  0%,100% { opacity: 0.08; }
  50%     { opacity: 0.22; }
}
.necessity-route-line {
  stroke-dasharray: 8 5;
  animation: routeDashMove 1s linear infinite;
}
@keyframes routeDashMove {
  to { stroke-dashoffset: -26; }
}
.disaster-popup .leaflet-popup-content-wrapper {
  background: #090d16;
  border: 1px solid #1e293b;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,.7);
  color: #f1f5f9;
}
.disaster-popup .leaflet-popup-tip { background: #090d16; }
.disaster-popup .leaflet-popup-close-button { color: #64748b !important; }
`;

let cssInjected = false;
function ensureCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = EXTRA_CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateRoute(coords: [number, number][], progress: number): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];
  if (progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dist = haversineKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) return coords[0];

  const targetLength = progress * totalLength;
  let currentSum = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const len = segmentLengths[i];
    if (currentSum + len >= targetLength) {
      const ratio = (targetLength - currentSum) / len;
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const lat = p1[0] + (p2[0] - p1[0]) * ratio;
      const lng = p1[1] + (p2[1] - p1[1]) * ratio;
      return [lat, lng];
    }
    currentSum += len;
  }
  return coords[coords.length - 1];
}

function makeNecessityIcon(type: NecessityType, delayMs: number): L.DivIcon {
  const m = NECESSITY_META[type];
  const size = 32;
  return L.divIcon({
    className: "",
    html: `<div style="
        width:${size}px;height:${size}px;
        background:${m.bg};border:2px solid ${m.color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 0 10px ${m.color}66;
        animation:markerDropIn 0.45s cubic-bezier(.22,1,.36,1) ${delayMs}ms both;">
      <span style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%) rotate(45deg);
        font-size:14px;line-height:1;">${m.emoji}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

function makeDisasterIcon(type: DisasterType): L.DivIcon {
  const m = DISASTER_META[type];
  const size = 44;
  return L.divIcon({
    className: "",
    html: `<div style="
        width:${size}px;height:${size}px;
        background:${m.bg};border:3px solid ${m.color};
        border-radius:50%;
        box-shadow:0 0 20px ${m.color};
        display:flex;align-items:center;justify-content:center;
        animation:markerDropIn 0.3s ease-out both;">
      <span style="font-size:22px;line-height:1;margin-bottom:2px;">${m.emoji}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

export function MapInner({
  center = [34.152, -118.243],
  zoom = 12,
  disasterType,
  disasterLocation,
  impactRadiusKm,
  necessities = [],
  tileStyle = "dark",
  isSimulating = false,
  dispatchedIds = [],
  onMapClick,
  onSimulationTick,
}: ResourceDisasterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const disasterMarkerRef = useRef<L.Marker | null>(null);
  const disasterCirclesRef = useRef<L.Circle[]>([]);
  const necessityMarkersRef = useRef<L.Marker[]>([]);
  const routePolylinesRef = useRef<L.Polyline[]>([]);

  const simMarkersRef = useRef<Map<string, { marker: L.Marker; type: string; route: [number, number][] }>>(new Map());
  const requestRef = useRef<number | null>(null);
  const simProgressRef = useRef<number>(0);

  const onMapClickRef = useRef(onMapClick);
  const onSimulationTickRef = useRef(onSimulationTick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onSimulationTickRef.current = onSimulationTick;
  }, [onSimulationTick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureCSS();

    const map = L.map(containerRef.current, {
      zoomControl: true,
      worldCopyJump: true,
      scrollWheelZoom: true,
    }).setView(center, zoom);
    mapRef.current = map;

    const tileDef = TILE_LAYERS[tileStyle] ?? TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(tileDef.url, {
      attribution: tileDef.attr,
      maxZoom: tileDef.maxZoom,
    }).addTo(map);

    map.on("click", (e) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(center, { animate: true });
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    const tileDef = TILE_LAYERS[tileStyle] ?? TILE_LAYERS.dark;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileDef.url, {
      attribution: tileDef.attr,
      maxZoom: tileDef.maxZoom,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [tileStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (disasterMarkerRef.current) {
      map.removeLayer(disasterMarkerRef.current);
      disasterMarkerRef.current = null;
    }
    disasterCirclesRef.current.forEach((c) => {
      try { map.removeLayer(c); } catch {}
    });
    disasterCirclesRef.current = [];

    if (!disasterLocation) return;

    const meta = DISASTER_META[disasterType];

    disasterMarkerRef.current = L.marker([disasterLocation.lat, disasterLocation.lng], {
      icon: makeDisasterIcon(disasterType),
      zIndexOffset: 1000,
    })
      .bindPopup(
        `<div style="font-family:system-ui,sans-serif; min-width: 180px; padding: 4px 0;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: ${meta.color};">
            ${meta.emoji} ACTIVE ${meta.label.toUpperCase()}
          </div>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: 4px;">
            Coordinates: ${disasterLocation.lat.toFixed(4)}, ${disasterLocation.lng.toFixed(4)}<br/>
            Impact Radius: ${impactRadiusKm} km
          </div>
        </div>`,
        { className: "disaster-popup" }
      )
      .addTo(map);

    const innerCircle = L.circle([disasterLocation.lat, disasterLocation.lng], {
      radius: impactRadiusKm * 1000 * 0.35,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    const middleCircle = L.circle([disasterLocation.lat, disasterLocation.lng], {
      radius: impactRadiusKm * 1000 * 0.7,
      color: "#f97316",
      fillColor: "#f97316",
      fillOpacity: 0.12,
      weight: 1.5,
    }).addTo(map);

    const outerCircle = L.circle([disasterLocation.lat, disasterLocation.lng], {
      radius: impactRadiusKm * 1000,
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.05,
      weight: 1,
      className: "disaster-zone-circle",
    }).addTo(map);

    disasterCirclesRef.current = [innerCircle, middleCircle, outerCircle];

    const circleEl = outerCircle.getElement() as HTMLElement | undefined;
    if (circleEl && circleEl.style) {
      circleEl.style.animation = "pulseZone 2s ease-in-out infinite";
    }
  }, [disasterLocation, disasterType, impactRadiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    necessityMarkersRef.current.forEach((m) => map.removeLayer(m));
    necessityMarkersRef.current = [];
    routePolylinesRef.current.forEach((p) => map.removeLayer(p));
    routePolylinesRef.current = [];

    if (!necessities || necessities.length === 0) return;

    const markers: L.Marker[] = [];
    const polylines: L.Polyline[] = [];

    necessities.forEach((svc) => {
      if (!svc.routePolyline || svc.routePolyline.length === 0) return;
      const meta = NECESSITY_META[svc.type];

      const glow = L.polyline(svc.routePolyline, {
        color: meta.routeColor,
        weight: 5,
        opacity: 0.15,
      }).addTo(map);
      polylines.push(glow);

      const routeLine = L.polyline(svc.routePolyline, {
        color: meta.routeColor,
        weight: 2.5,
        opacity: 0.8,
        className: "necessity-route-line",
      })
        .bindTooltip(
          `${meta.emoji} ${svc.name} · ${svc.roadDistanceKm?.toFixed(1)} km · ${svc.etaMinutes} min`,
          { sticky: true, className: "bg-slate-900 text-slate-100 text-xs border border-slate-700 rounded px-2 py-1" }
        )
        .addTo(map);
      polylines.push(routeLine);
    });

    necessities.forEach((svc, index) => {
      const delay = Math.min(index * 50, 1500);
      const icon = makeNecessityIcon(svc.type, delay);
      const meta = NECESSITY_META[svc.type];

      const roadDetail = svc.roadDistanceKm
        ? `<div style="color:#10b981;font-weight:600;margin-top:4px;">
             🚗 ${svc.roadDistanceKm.toFixed(1)} km (by road) · ETA <strong>${svc.etaMinutes} min</strong>
           </div>`
        : `<div style="color:#94a3b8;margin-top:4px;">📍 ${svc.distanceKm.toFixed(1)} km (straight-line)</div>`;

      const qtyInfo = svc.qty ? `<div style="margin-top:2px; font-weight: 500;">📦 Status: ${svc.qty}</div>` : "";
      const contactInfo = svc.contact ? `<div style="margin-top:2px; color: #94a3b8;">📞 Contact: ${svc.contact}</div>` : "";

      const marker = L.marker([svc.lat, svc.lng], { icon, zIndexOffset: 500 })
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif; min-width: 200px; padding: 2px 0;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="font-size:18px">${meta.emoji}</span>
              <div>
                <div style="color:#f8fafc; font-size:12px; font-weight:700; line-height:1.2;">
                  ${svc.name}
                </div>
                <div style="color:${meta.color}; font-size:9px; text-transform:uppercase; letter-spacing:.05em;">
                  ${meta.label}
                </div>
              </div>
            </div>
            <div style="font-size:11px; border-top: 1px solid #1e293b; padding-top:6px;">
              ${roadDetail}
              ${qtyInfo}
              ${contactInfo}
            </div>
          </div>`,
          { className: "disaster-popup" }
        )
        .addTo(map);

      markers.push(marker);
    });

    necessityMarkersRef.current = markers;
    routePolylinesRef.current = polylines;
  }, [necessities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clearSim = () => {
      simMarkersRef.current.forEach(({ marker }) => {
        try {
          map.removeLayer(marker);
        } catch {}
      });
      simMarkersRef.current.clear();
      simProgressRef.current = 0;
    };

    const hasDispatches = dispatchedIds && dispatchedIds.length > 0;

    if (!isSimulating && !hasDispatches) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      clearSim();
      return;
    }

    clearSim();

    necessities.forEach((svc) => {
      if (!svc.routePolyline || svc.routePolyline.length < 2) return;

      const shouldSim = isSimulating || (dispatchedIds && dispatchedIds.includes(svc.id));
      if (!shouldSim) return;

      let emoji = "🚗";
      let typeName = "support";
      const route = [...svc.routePolyline];

      if (svc.type === "volunteer") {
        emoji = "🏃";
        typeName = "volunteer";
      } else if (svc.type === "food") {
        emoji = "🚚";
        typeName = "supply_food";
      } else if (svc.type === "water") {
        emoji = "🚛";
        typeName = "supply_water";
      } else if (svc.type === "shelter") {
        emoji = "🚶";
        typeName = "evacuee";
        route.reverse();
      }

      const mIcon = L.divIcon({
        className: "",
        html: `<div style="
            width:26px;height:26px;
            background:#090d16;border:1.5px solid ${NECESSITY_META[svc.type].color};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 12px ${NECESSITY_META[svc.type].color};
            font-size:13px;">${emoji}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const simMarker = L.marker(route[0], { icon: mIcon, zIndexOffset: 900 }).addTo(map);
      simMarkersRef.current.set(svc.id, { marker: simMarker, type: typeName, route });
    });

    let startTime = performance.now();
    const duration = 12000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      simProgressRef.current = rawProgress;

      simMarkersRef.current.forEach(({ marker, type, route }) => {
        let p = rawProgress;
        if (type === "evacuee") {
          p = Math.max(0, (rawProgress - 0.3) / 0.7);
        } else {
          p = Math.min(1, rawProgress / 0.7);
        }

        const pos = interpolateRoute(route, p);
        marker.setLatLng(pos);
      });

      onSimulationTickRef.current?.(rawProgress);

      if (rawProgress < 1) {
        requestRef.current = requestAnimationFrame(tick);
      } else {
        startTime = performance.now();
        requestRef.current = requestAnimationFrame(tick);
      }
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      clearSim();
    };
  }, [isSimulating, necessities, dispatchedIds]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl animate-fade-in"
      style={{ willChange: "transform", minHeight: "450px" }}
    />
  );
}
