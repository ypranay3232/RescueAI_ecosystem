// Elevation data using Open-Meteo API (free, no API key required)

export interface ElevationData {
  elevation: number; // meters above sea level
  latitude: number;
  longitude: number;
}

export async function fetchElevation(lat: number, lng: number): Promise<ElevationData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Elevation API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.elevation === undefined || data.elevation === null) {
      return null;
    }

    return {
      elevation: data.elevation,
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error('Error fetching elevation:', error);
    return null;
  }
}

export function formatElevation(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(Number(meters))) {
    return 'N/A';
  }
  const numMeters = Number(meters);
  if (numMeters < 1000) {
    return `${numMeters.toFixed(0)} m`;
  }
  return `${(numMeters / 1000).toFixed(2)} km`;
}

export function metersToFeet(meters: number | null | undefined): number {
  if (meters === null || meters === undefined || isNaN(Number(meters))) {
    return 0;
  }
  return Number(meters) * 3.28084;
}
