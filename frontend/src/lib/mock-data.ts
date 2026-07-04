export type StatusLevel = "green" | "yellow" | "red";

export interface Survivor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heartRate: number;
  temperature: number;
  movement: "active" | "limited" | "none";
  status: StatusLevel;
  lastUpdate: string;
}

export interface DroneRoute {
  id: string;
  name: string;
  waypoints: Array<[number, number]>;
  color: string;
}

export interface SearchZone {
  center: [number, number];
  radiusKm: number;
  confidence: number;
  priorityRegions: Array<{
    name: string;
    lat: number;
    lng: number;
    priority: number;
    confidence: number;
  }>;
}

export const DEFAULT_AIRCRAFT = {
  last_lat: 34.152,
  last_lng: -118.243,
  speed_knots: 180,
  heading_deg: 135,
  altitude_ft: 8500,
  minutes_since_contact: 23,
  weather: "partly cloudy, moderate wind",
};

export const MOCK_SURVIVORS: Survivor[] = [
  {
    id: "W1",
    name: "Survivor Alpha",
    lat: 34.159,
    lng: -118.237,
    heartRate: 98,
    temperature: 36.8,
    movement: "limited",
    status: "yellow",
    lastUpdate: "2 min ago",
  },
  {
    id: "W2",
    name: "Survivor Beta",
    lat: 34.161,
    lng: -118.252,
    heartRate: 72,
    temperature: 36.4,
    movement: "active",
    status: "green",
    lastUpdate: "30 sec ago",
  },
  {
    id: "W3",
    name: "Survivor Gamma",
    lat: 34.148,
    lng: -118.261,
    heartRate: 118,
    temperature: 35.1,
    movement: "none",
    status: "red",
    lastUpdate: "5 min ago",
  },
];

export const MOCK_SEARCH_ZONE: SearchZone = {
  center: [34.152, -118.243],
  radiusKm: 12.5,
  confidence: 0.78,
  priorityRegions: [
    { name: "Sector A", lat: 34.158, lng: -118.231, priority: 5, confidence: 0.91 },
    { name: "Sector B", lat: 34.145, lng: -118.255, priority: 4, confidence: 0.82 },
    { name: "Sector C", lat: 34.162, lng: -118.248, priority: 3, confidence: 0.71 },
  ],
};

export const MOCK_DRONE_ROUTES: DroneRoute[] = [
  {
    id: "D2",
    name: "Drone 2 — Sector C",
    color: "#f97316",
    waypoints: [
      [34.153, -118.228],
      [34.158, -118.235],
      [34.162, -118.248],
      [34.159, -118.237],
    ],
  },
  {
    id: "D3",
    name: "Drone 3 — Perimeter",
    color: "#3b82f6",
    waypoints: [
      [34.145, -118.255],
      [34.162, -118.255],
      [34.162, -118.228],
      [34.145, -118.228],
    ],
  },
];

export const MOCK_RECOMMENDATIONS = [
  {
    priority: 1,
    action: "Deploy Drone 2 to Sector C — 2 possible survivors detected",
    eta_minutes: 4,
    resource: "Drone 2",
  },
  {
    priority: 2,
    action: "Route Ambulance Alpha to LZ-2 staging area",
    eta_minutes: 12,
    resource: "Ambulance Alpha",
  },
  {
    priority: 3,
    action: "Delay Drone 1 launch — high winds in 18 min",
    eta_minutes: 0,
    resource: "Drone 1",
  },
];

export const DASHBOARD_METRICS = [
  { label: "Active Incidents", value: 3, change: "+1", trend: "up" as const },
  { label: "Survivors Tracked", value: 3, change: "2 yellow, 1 red", trend: "neutral" as const },
  { label: "Drones Deployed", value: 1, change: "2 available", trend: "neutral" as const },
  { label: "Search Confidence", value: "78%", change: "+6%", trend: "up" as const },
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Command Center", icon: "LayoutDashboard" },
  { href: "/search", label: "Aircraft Search", icon: "Plane" },
  { href: "/drones", label: "Drone Intel", icon: "Drone" },
  { href: "/wearables", label: "Wearables", icon: "HeartPulse" },
  { href: "/routing", label: "Route Planner", icon: "Flame" },
  { href: "/resources", label: "Resources", icon: "Truck" },
];
