import type { EmergencyService, EmergencyServiceType } from "@/components/maps/rescue-map";

// ─── constants ───────────────────────────────────────────────────────────────

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
/**
 * OSRM demo server — free, no key, real OpenStreetMap road graph.
 * Supports car routing. Rate-limit: be kind, don't hammer it.
 */
const OSRM_ENDPOINT = "https://router.project-osrm.org";

// ─── geometry helpers ─────────────────────────────────────────────────────────

/** Haversine distance in km */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
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

/**
 * Decode a Google/OSRM polyline string into [[lat,lng], ...] pairs.
 * OSRM returns geometry as a standard encoded polyline (precision 5).
 */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// ─── OSRM routing ─────────────────────────────────────────────────────────────

interface OsrmRoute {
  roadDistanceKm: number;
  etaMinutes: number;
  routePolyline: [number, number][];
}

/**
 * Fetch the fastest road route between two points using the public OSRM server.
 * Returns null on any failure so callers can fall back gracefully.
 */
export async function fetchOsrmRoute(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number
): Promise<OsrmRoute | null> {
  try {
    const url =
      `${OSRM_ENDPOINT}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=simplified&geometries=polyline&steps=false`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.length) return null;

    const route = json.routes[0];
    return {
      roadDistanceKm: route.distance / 1000,
      etaMinutes: Math.ceil(route.duration / 60),
      routePolyline: decodePolyline(route.geometry),
    };
  } catch {
    return null;
  }
}

// ─── Overpass POI fetch ───────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Fetch hospitals, police stations and fire stations within `radiusKm` of the
 * given coordinate using the Overpass API (real OSM data, no key required).
 *
 * For the single nearest facility of each type we also fetch the road route
 * from the crash site via OSRM so we can display real ETA and draw the path.
 */
export async function fetchEmergencyServices(
  lat: number,
  lng: number,
  radiusKm = 30
): Promise<EmergencyService[]> {
  const radiusM = radiusKm * 1000;

  const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radiusM},${lat},${lng});
  way["amenity"="hospital"](around:${radiusM},${lat},${lng});
  node["amenity"="clinic"](around:${radiusM},${lat},${lng});
  way["amenity"="clinic"](around:${radiusM},${lat},${lng});
  node["amenity"="police"](around:${radiusM},${lat},${lng});
  way["amenity"="police"](around:${radiusM},${lat},${lng});
  node["amenity"="fire_station"](around:${radiusM},${lat},${lng});
  way["amenity"="fire_station"](around:${radiusM},${lat},${lng});
);
out center tags 80;
`.trim();

  let rawServices: EmergencyService[] = [];

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    const json = (await res.json()) as { elements: OverpassElement[] };

    const amenityToType: Record<string, EmergencyServiceType> = {
      hospital:     "hospital",
      clinic:       "hospital",   // treat clinics as hospitals
      police:       "police",
      fire_station: "fire_station",
    };

    const seen = new Set<string>();

    for (const el of json.elements) {
      const amenity = el.tags?.["amenity"];
      const type = amenity ? amenityToType[amenity] : undefined;
      if (!type) continue;

      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (elLat === undefined || elLng === undefined) continue;

      const dedupeKey = `${elLat.toFixed(4)},${elLng.toFixed(4)},${type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const name =
        el.tags?.["name"] ??
        el.tags?.["name:en"] ??
        defaultName(type);

      rawServices.push({
        id:         `${el.type}-${el.id}`,
        type,
        name,
        lat:        elLat,
        lng:        elLng,
        distanceKm: haversineKm(lat, lng, elLat, elLng),
        address:    buildAddress(el.tags),
        phone:      el.tags?.["phone"] ?? el.tags?.["contact:phone"] ?? el.tags?.["telephone"],
        website:    el.tags?.["website"] ?? el.tags?.["contact:website"],
      });
    }
  } catch (err) {
    console.warn("[overpass] fetch failed:", err);
    return [];
  }

  // Sort + cap per category (12 max each)
  rawServices = sortAndCap(rawServices);

  // Mark the nearest of each type
  const nearest: Partial<Record<EmergencyServiceType, string>> = {};
  for (const svc of rawServices) {
    if (!nearest[svc.type]) nearest[svc.type] = svc.id;
  }
  for (const svc of rawServices) {
    svc.isNearest = nearest[svc.type] === svc.id;
  }

  // Fetch OSRM road routes for the nearest 1 of each category in parallel
  // (max 3 OSRM calls — respectful of the free server)
  const nearestServices = rawServices.filter((s) => s.isNearest);
  await Promise.allSettled(
    nearestServices.map(async (svc) => {
      const route = await fetchOsrmRoute(lat, lng, svc.lat, svc.lng);
      if (route) {
        svc.roadDistanceKm = route.roadDistanceKm;
        svc.etaMinutes     = route.etaMinutes;
        svc.routePolyline  = route.routePolyline;
      }
    })
  );

  return rawServices;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultName(type: EmergencyServiceType): string {
  return type === "hospital"
    ? "Hospital / Clinic"
    : type === "police"
    ? "Police Station"
    : "Fire Station";
}

function buildAddress(tags?: Record<string, string>): string | undefined {
  if (!tags) return undefined;
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] ?? tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function sortAndCap(services: EmergencyService[]): EmergencyService[] {
  const byType: Record<EmergencyServiceType, EmergencyService[]> = {
    hospital:     [],
    police:       [],
    fire_station: [],
  };
  for (const s of services) byType[s.type].push(s);

  for (const type of Object.keys(byType) as EmergencyServiceType[]) {
    byType[type].sort((a, b) => a.distanceKm - b.distanceKm);
    byType[type] = byType[type].slice(0, 12);
  }

  return [...byType.hospital, ...byType.police, ...byType.fire_station];
}
