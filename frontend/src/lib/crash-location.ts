export interface MapPoint {
  lat: number;
  lng: number;
}

export function shouldAcceptCrashSelection(
  selectingCrashLocation: boolean,
  flightStatus: "idle" | "flying" | "signal_lost" | "calculating"
): boolean {
  return selectingCrashLocation && (flightStatus === "idle" || flightStatus === "flying");
}

export function getFlightTarget(
  manualCrashLocation: MapPoint | null,
  endLat: number,
  endLng: number
): MapPoint {
  if (manualCrashLocation) {
    return manualCrashLocation;
  }
  return { lat: endLat, lng: endLng };
}

export function hasReachedPoint(
  current: MapPoint,
  target: MapPoint,
  threshold = 0.05
): boolean {
  return Math.hypot(current.lat - target.lat, current.lng - target.lng) < threshold;
}
