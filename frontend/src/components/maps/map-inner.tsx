"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RescueMapProps, EmergencyService, EmergencyServiceType } from "./rescue-map";

// ─── tile layer definitions ───────────────────────────────────────────────────

const TILE_LAYERS = {
  dark: {
    url:   "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
    maxZoom: 19,
  },
  satellite: {
    url:   "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:  "Tiles &copy; Esri — Source: Esri, USGS, NOAA",
    maxZoom: 19,
  },
  terrain: {
    url:   "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attr:  '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  light: {
    url:   "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr:  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
    maxZoom: 19,
  },
} as const;

// ─── service meta ────────────────────────────────────────────────────────────

const SERVICE_META: Record<
  EmergencyServiceType,
  { color: string; bg: string; emoji: string; label: string; routeColor: string }
> = {
  hospital:     { color: "#ec4899", bg: "#1a0010", emoji: "🏥", label: "Hospital",      routeColor: "#ec4899" },
  police:       { color: "#3b82f6", bg: "#000d1a", emoji: "🚔", label: "Police",        routeColor: "#3b82f6" },
  fire_station: { color: "#f97316", bg: "#1a0800", emoji: "🚒", label: "Fire Station",  routeColor: "#f97316" },
};

// ─── CSS (injected once) ──────────────────────────────────────────────────────

const EXTRA_CSS = `
@keyframes markerDropIn {
  0%   { transform: translateY(-24px) scale(0.6); opacity: 0; }
  70%  { transform: translateY(4px) scale(1.08);  opacity: 1; }
  100% { transform: translateY(0)   scale(1);     opacity: 1; }
}
@keyframes crashPulse {
  0%,100% { transform:scale(1);   opacity:1;    }
  50%     { transform:scale(1.2); opacity:0.85; }
}
@keyframes crashRing {
  0%   { transform:scale(0.8); opacity:1; }
  100% { transform:scale(1.6); opacity:0; }
}
/* animated dash on route polylines */
.route-line {
  stroke-dasharray: 10 6;
  animation: dashMove 1.2s linear infinite;
}
@keyframes dashMove {
  to { stroke-dashoffset: -32; }
}
/* leaflet popup dark theme */
.rescue-popup .leaflet-popup-content-wrapper {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.6);
  color: #f1f5f9;
}
.rescue-popup .leaflet-popup-tip { background: #0f172a; }
.rescue-popup .leaflet-popup-close-button { color: #94a3b8 !important; }
.ping-btn {
  display:inline-flex;align-items:center;gap:6px;
  margin-top:10px;padding:6px 14px;
  background:linear-gradient(135deg,#ef4444,#dc2626);
  color:#fff;font-size:12px;font-weight:600;
  border:none;border-radius:8px;cursor:pointer;
  transition:transform .15s,opacity .15s;
  width:100%;justify-content:center;
}
.ping-btn:hover  { transform:scale(1.04); opacity:.93; }
.ping-btn:active { transform:scale(.96); }
`;

let cssInjected = false;
function ensureCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = EXTRA_CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

// ─── icon factories ───────────────────────────────────────────────────────────

function makeServiceIcon(type: EmergencyServiceType, delayMs: number, isNearest: boolean): L.DivIcon {
  const m = SERVICE_META[type];
  const glow = isNearest ? `0 0 20px ${m.color}` : `0 0 8px ${m.color}88`;
  const size = isNearest ? 38 : 30;
  const fontSize = isNearest ? "17px" : "13px";
  return L.divIcon({
    className: "",
    html: `<div style="
        width:${size}px;height:${size}px;
        background:${m.bg};border:2px solid ${m.color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:${glow};
        animation:markerDropIn 0.45s cubic-bezier(.22,1,.36,1) ${delayMs}ms both;">
      <span style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%) rotate(45deg);
        font-size:${fontSize};line-height:1;">${m.emoji}</span>
      ${isNearest ? `<span style="
        position:absolute;top:-6px;right:-6px;transform:rotate(45deg);
        width:12px;height:12px;background:#22c55e;border-radius:50%;
        border:2px solid #0f172a;box-shadow:0 0 6px #22c55e;"></span>` : ""}
    </div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

// ─── popup HTML ───────────────────────────────────────────────────────────────

function makeServicePopup(svc: EmergencyService): string {
  const meta = SERVICE_META[svc.type];
  const addressLine = svc.address
    ? `<div style="color:#94a3b8;margin-top:2px;">📍 ${svc.address}</div>` : "";
  const phoneLine = svc.phone
    ? `<div style="color:#94a3b8;margin-top:2px;">📞 <a href="tel:${svc.phone}" style="color:#60a5fa">${svc.phone}</a></div>` : "";
  const websiteLine = svc.website
    ? `<div style="margin-top:2px;">🌐 <a href="${svc.website}" target="_blank" style="color:#60a5fa;text-decoration:underline">Website</a></div>` : "";

  const straightLine = `${svc.distanceKm.toFixed(1)} km straight-line`;
  const roadLine = svc.roadDistanceKm != null
    ? `<div style="color:#22c55e;font-weight:600;margin-top:4px;">
         🚗 ${svc.roadDistanceKm.toFixed(1)} km by road
         · ETA <strong>${svc.etaMinutes} min</strong>
       </div>`
    : `<div style="color:#64748b;margin-top:4px;">~${straightLine}</div>`;

  const nearestBadge = svc.isNearest
    ? `<span style="background:#22c55e22;color:#22c55e;font-size:10px;
         padding:2px 8px;border-radius:99px;margin-left:6px;">NEAREST</span>` : "";

  return `
    <div style="font-family:system-ui,sans-serif;min-width:210px;padding:2px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:22px">${meta.emoji}</span>
        <div>
          <div style="color:#f8fafc;font-size:13px;font-weight:700;line-height:1.3;">
            ${svc.name}${nearestBadge}
          </div>
          <div style="color:${meta.color};font-size:10px;text-transform:uppercase;letter-spacing:.06em;">
            ${meta.label}
          </div>
        </div>
      </div>
      <div style="font-size:12px;border-top:1px solid #1e293b;padding-top:8px;">
        ${roadLine}
        ${addressLine}
        ${phoneLine}
        ${websiteLine}
      </div>
      <button class="ping-btn" data-svc-id="${svc.id}">
        📡 Ping Emergency Alert
      </button>
    </div>`;
}

// ─── component ────────────────────────────────────────────────────────────────

export function MapInner({
  center = [34.152, -118.243],
  zoom = 12,
  searchZone,
  markers = [],
  routes = [],
  survivors = [],
  showHeatmap = false,
  onMapClick,
  onMapRightClick,
  crashScenarios = [],
  selectingCrashLocation = false,
  crashLocation = null,
  emergencyServices = [],
  onPingService,
  tileStyle = "dark",
}: RescueMapProps) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<L.Map | null>(null);
  const tileLayerRef       = useRef<L.TileLayer | null>(null);
  const currentMarkerRef   = useRef<L.Marker | null>(null);
  const crashMarkerRef     = useRef<L.Marker | null>(null);
  const prevPositionRef    = useRef<string>("");
  const prevCrashKeyRef    = useRef<string>("");
  const radarCircleRef     = useRef<L.Circle | null>(null);
  const radarAnimRef       = useRef<number | null>(null);
  const emergencyLayerRef  = useRef<L.LayerGroup | null>(null);
  const onMapClickRef      = useRef(onMapClick);
  const onMapRightClickRef = useRef(onMapRightClick);
  const onPingServiceRef   = useRef(onPingService);
  // keep a stable id→service lookup for popup button clicks
  const svcMapRef          = useRef<Map<string, EmergencyService>>(new Map());

  useEffect(() => { onMapClickRef.current      = onMapClick;      }, [onMapClick]);
  useEffect(() => { onMapRightClickRef.current = onMapRightClick; }, [onMapRightClick]);
  useEffect(() => { onPingServiceRef.current   = onPingService;   }, [onPingService]);

  // ── map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureCSS();

    const map = L.map(containerRef.current, {
      zoomControl: true,
      zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
      worldCopyJump: true, scrollWheelZoom: true,
    }).setView(center, zoom);
    mapRef.current = map;

    const tileDef = TILE_LAYERS[tileStyle] ?? TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(tileDef.url, {
      attribution: tileDef.attr,
      maxZoom: tileDef.maxZoom,
    }).addTo(map);

    map.on("click",       (e) => onMapClickRef.current?.(e.latlng.lat, e.latlng.lng));
    map.on("contextmenu", (e) => {
      e.originalEvent.preventDefault();
      onMapRightClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    // Delegate ping button clicks from popups (event delegation on map pane)
    map.getContainer().addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(".ping-btn");
      if (!btn) return;
      const id = btn.dataset.svcId;
      if (!id) return;
      const svc = svcMapRef.current.get(id);
      if (svc) onPingServiceRef.current?.(svc);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── recenter ────────────────────────────────────────────────────────────────
  // Track whether the map has been initially centred so subsequent updates
  // only pan (preserving the user's manual zoom level) rather than resetting zoom.
  const initialCentreRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!initialCentreRef.current) {
      map.setView(center, zoom);
      initialCentreRef.current = true;
    } else {
      // Pan only — don't touch zoom so the user can scroll in/out freely
      map.panTo(center, { animate: false });
    }
  }, [center]);

  // ── tile layer swap ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tileDef = TILE_LAYERS[tileStyle] ?? TILE_LAYERS.dark;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(tileDef.url, {
      attribution: tileDef.attr,
      maxZoom: tileDef.maxZoom,
    }).addTo(map);
    // Ensure tile is below everything else
    tileLayerRef.current.bringToBack();
  }, [tileStyle]);

  // ── main data layers ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: L.Layer[] = [];

    if (searchZone) {
      layers.push(L.circle(searchZone.center, {
        radius: searchZone.radiusKm * 1000,
        color: "#f97316", fillColor: "#f97316", fillOpacity: 0.08,
        weight: 2, dashArray: "8 6",
      }).bindPopup(`Search zone — ${Math.round(searchZone.confidence * 100)}% confidence`).addTo(map));
    }

    routes.forEach((route) => {
      const valid = route.waypoints.filter(
        (wp) => wp && !isNaN(wp[0]) && !isNaN(wp[1])
      );
      if (valid.length < 2) return;
      layers.push(L.polyline(valid, {
        color: route.color, weight: 3, opacity: 0.85, dashArray: "5 5",
      }).bindPopup(route.name).addTo(map));
    });

    survivors.forEach((s) => {
      const color = s.status === "red" ? "#ef4444" : s.status === "yellow" ? "#eab308" : "#22c55e";
      const isRed = s.status === "red";
      const ringHtml = isRed ? `<div style="position:absolute;inset:-6px;border:2px dashed #ef4444;border-radius:50%;animation:crashRing 1.5s ease-out infinite;"></div>` : "";
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          ${ringHtml}
          <div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color};${isRed ? 'animation:crashPulse 1.5s ease-in-out infinite;' : ''}"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([s.lat, s.lng], { icon })
        .bindPopup(`<strong>${s.name}</strong><br/>HR: ${s.heartRate} bpm<br/>Temp: ${s.temperature}°C`)
        .addTo(map);
    });

    markers.forEach((m) => {
      if (m.label === "Current Position") return;
      if (m.label === "Intermediate Stop" || m.label === "Crash Incident") {
        const icon = L.divIcon({
          className: "crash-incident-marker",
          html: `<div style="position:relative;width:36px;height:36px;">
            <div style="position:absolute;inset:0;background:#ef4444;border-radius:50%;border:3px solid white;
              box-shadow:0 0 20px #ef4444;animation:crashPulse 1.5s ease-in-out infinite;"></div>
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20"
              style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z
                       m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
          iconSize: [36, 36], iconAnchor: [18, 18],
        });
        layers.push(L.marker([m.lat, m.lng], { icon }).bindPopup(m.popup ?? m.label ?? "").addTo(map));
      } else if (m.radius) {
        layers.push(L.circle([m.lat, m.lng], {
          radius: m.radius, color: m.color ?? "#3b82f6", fillOpacity: 0.1,
        }).bindPopup(m.popup ?? "").addTo(map));
      } else {
        layers.push(L.circleMarker([m.lat, m.lng], {
          radius: 6, color: m.color ?? "#fff", fillColor: m.color ?? "#fff", fillOpacity: 0.8,
        }).bindPopup(m.popup ?? "").addTo(map));
      }
    });

    crashScenarios.forEach((s) => {
      layers.push(L.circle(s.center, {
        radius: s.radiusKm * 1000, color: s.color, fillColor: s.color, fillOpacity: 0.1, weight: 2,
      }).bindPopup(
        `<strong>${s.name}</strong><br/>${s.description}<br/>` +
        `Probability: ${Math.round(s.probability * 100)}%<br/>Max: ${s.factors.maxDistance.toFixed(1)} km`
      ).addTo(map));
    });

    return () => { layers.forEach((l) => { try { map.removeLayer(l); } catch {} }); };
  }, [searchZone, routes, survivors, showHeatmap, crashScenarios, markers]);

  // ── crash-location preview ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = crashLocation ? `${crashLocation.lat.toFixed(6)},${crashLocation.lng.toFixed(6)}` : "";

    if (crashLocation && key !== prevCrashKeyRef.current) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:40px;height:40px;">
          <div style="position:absolute;inset:-6px;border:2px dashed #ef4444;border-radius:50%;
            animation:crashRing 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:0;background:#ef4444;border-radius:50%;
            border:3px solid white;box-shadow:0 0 24px #ef4444;"></div>
          <svg viewBox="0 0 24 24" fill="white" width="22" height="22"
            style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z
                     m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
        iconSize: [40, 40], iconAnchor: [20, 20],
      });
      if (crashMarkerRef.current) {
        crashMarkerRef.current.setLatLng([crashLocation.lat, crashLocation.lng]);
      } else {
        crashMarkerRef.current = L.marker([crashLocation.lat, crashLocation.lng], { icon, zIndexOffset: 1000 })
          .bindPopup("<strong>Crash Incident Site</strong>")
          .addTo(map);
      }
      prevCrashKeyRef.current = key;
    } else if (!crashLocation && crashMarkerRef.current) {
      try { map.removeLayer(crashMarkerRef.current); } catch {}
      crashMarkerRef.current = null;
      prevCrashKeyRef.current = "";
    }
  }, [crashLocation]);

  // ── aircraft position marker ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pos = markers.find((m) => m.label === "Current Position");
    const key = pos ? `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}` : "";

    if (pos && key !== prevPositionRef.current) {
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setLatLng([pos.lat, pos.lng]);
      } else {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${pos.color};width:32px;height:32px;border-radius:50%;
            border:4px solid white;box-shadow:0 0 16px ${pos.color};
            display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19
                       l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        });
        currentMarkerRef.current = L.marker([pos.lat, pos.lng], { icon })
          .bindPopup("Current Position").addTo(map);
      }
      prevPositionRef.current = key;
    } else if (!pos && currentMarkerRef.current) {
      try { map.removeLayer(currentMarkerRef.current); } catch {}
      currentMarkerRef.current = null;
      prevPositionRef.current = "";
    }
  }, [markers]);

  // ── radar pulse ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (crashScenarios.length > 0) {
      const primary = crashScenarios[0];
      if (radarCircleRef.current) map.removeLayer(radarCircleRef.current);
      const maxR = primary.radiusKm * 1000;
      const radarCircle = L.circle(primary.center, {
        radius: maxR, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 2,
      }).addTo(map);
      radarCircleRef.current = radarCircle;

      let radius = 0, expanding = true, lastUpdate = 0;
      const animate = (ts: number) => {
        if (!radarCircleRef.current) return;
        if (ts - lastUpdate > 50) {
          lastUpdate = ts;
          expanding ? (radius += maxR / 30) : (radius -= maxR / 30);
          if (radius >= maxR) { radius = maxR; expanding = false; }
          if (radius <= 0)    { radius = 0;    expanding = true; }
          radarCircleRef.current.setRadius(radius);
          const op = 0.1 + (radius / maxR) * 0.2;
          radarCircleRef.current.setStyle({ fillOpacity: op, opacity: 0.3 + (radius / maxR) * 0.4 });
        }
        radarAnimRef.current = requestAnimationFrame(animate);
      };
      radarAnimRef.current = requestAnimationFrame(animate);
    } else {
      if (radarCircleRef.current) { map.removeLayer(radarCircleRef.current); radarCircleRef.current = null; }
      if (radarAnimRef.current)   { cancelAnimationFrame(radarAnimRef.current); radarAnimRef.current = null; }
    }

    return () => { if (radarAnimRef.current) cancelAnimationFrame(radarAnimRef.current); };
  }, [crashScenarios]);

  // ── emergency services overlay (markers + route polylines) ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (emergencyLayerRef.current) {
      map.removeLayer(emergencyLayerRef.current);
      emergencyLayerRef.current = null;
    }
    svcMapRef.current.clear();

    if (!emergencyServices || emergencyServices.length === 0) return;

    const group = L.layerGroup();

    // 1. Draw road route polylines first (under markers)
    emergencyServices.forEach((svc) => {
      if (!svc.isNearest || !svc.routePolyline?.length) return;
      const meta = SERVICE_META[svc.type];

      // Outer glow line
      L.polyline(svc.routePolyline, {
        color: meta.routeColor,
        weight: 6,
        opacity: 0.18,
        className: "",
      }).addTo(group);

      // Animated dashed line on top
      L.polyline(svc.routePolyline, {
        color: meta.routeColor,
        weight: 3,
        opacity: 0.85,
        className: "route-line",
      })
        .bindTooltip(
          `${meta.emoji} ${svc.name} · ${svc.roadDistanceKm?.toFixed(1)} km · ${svc.etaMinutes} min`,
          { sticky: true, className: "bg-slate-900 text-slate-100 text-xs border border-slate-700 rounded px-2 py-1" }
        )
        .addTo(group);
    });

    // 2. Draw service markers (on top of routes)
    emergencyServices.forEach((svc, index) => {
      svcMapRef.current.set(svc.id, svc);

      const delay = Math.min(index * 60, 1800);
      const icon  = makeServiceIcon(svc.type, delay, !!svc.isNearest);

      L.marker([svc.lat, svc.lng], { icon, zIndexOffset: svc.isNearest ? 800 : 400 })
        .bindPopup(makeServicePopup(svc), {
          maxWidth: 280,
          className: "rescue-popup",
          autoPan: true,
        })
        .addTo(group);
    });

    group.addTo(map);
    emergencyLayerRef.current = group;

    return () => {
      if (emergencyLayerRef.current) {
        map.removeLayer(emergencyLayerRef.current);
        emergencyLayerRef.current = null;
      }
    };
  }, [emergencyServices]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl"
      style={{ willChange: "transform" }}
    />
  );
}
