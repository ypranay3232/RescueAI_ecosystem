"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { DroneRoute, SearchZone } from "@/lib/mock-data";
import type { Survivor } from "@/lib/mock-data";
import { memo } from "react";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  radius?: number;
  popup?: string;
}

export interface CrashScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  center: [number, number];
  radiusKm: number;
  color: string;
  factors: {
    maxDistance: number;
    glideRatio: number;
    fuelRange: number;
  };
}

export type EmergencyServiceType = "hospital" | "police" | "fire_station";

export interface EmergencyService {
  id: string;
  type: EmergencyServiceType;
  name: string;
  lat: number;
  lng: number;
  /** straight-line haversine distance in km from the crash/LKP point */
  distanceKm: number;
  address?: string;
  phone?: string;
  website?: string;
  /** real road distance in km via OSRM routing */
  roadDistanceKm?: number;
  /** estimated driving time in minutes via OSRM */
  etaMinutes?: number;
  /** decoded polyline waypoints [[lat,lng],...] for the road route */
  routePolyline?: [number, number][];
  /** whether this is the nearest of its type (drives the "show route" decision) */
  isNearest?: boolean;
}

export type MapTileStyle = "dark" | "satellite" | "terrain" | "light";

export interface RescueMapProps {
  center?: [number, number];
  zoom?: number;
  searchZone?: SearchZone;
  markers?: MapMarker[];
  routes?: DroneRoute[];
  survivors?: Survivor[];
  showHeatmap?: boolean;
  className?: string;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMapRightClick?: (lat: number, lng: number) => void;
  crashScenarios?: CrashScenario[];
  selectingCrashLocation?: boolean;
  crashLocation?: { lat: number; lng: number } | null;
  emergencyServices?: EmergencyService[];
  onPingService?: (service: EmergencyService) => void;
  tileStyle?: MapTileStyle;
}

const MapInner = dynamic(() => import("./map-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[400px] w-full rounded-xl" />,
});

const RescueMapInner = memo(MapInner);

export function RescueMap(props: RescueMapProps) {
  return (
    <div className={props.className} style={{ height: props.height ?? "100%", minHeight: 400 }}>
      <RescueMapInner {...props} />
    </div>
  );
}
