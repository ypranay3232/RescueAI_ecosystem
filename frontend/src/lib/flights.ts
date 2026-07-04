// ADS-B flight tracking using OpenSky Network API (free, no API key required)

export interface FlightData {
  icao24: string;
  callsign: string;
  originCountry: string;
  timePosition: number;
  lastContact: number;
  longitude: number;
  latitude: number;
  baroAltitude: number;
  onGround: boolean;
  velocity: number;
  trueTrack: number;
  verticalRate: number;
  sensors: number[];
  geoAltitude: number;
  squawk: string;
  spi: boolean;
  positionSource: number;
}

export interface NearbyFlightsResponse {
  time: number;
  states: (string | number)[][];
}

export async function fetchNearbyFlights(
  lat: number,
  lng: number,
  radiusKm: number = 100
): Promise<FlightData[]> {
  try {
    // OpenSky Network API - no authentication required for basic queries
    const lamin = lat - (radiusKm / 111);
    const lamax = lat + (radiusKm / 111);
    const lomin = lng - (radiusKm / (111 * Math.cos(lat * Math.PI / 180)));
    const lomax = lng + (radiusKm / (111 * Math.cos(lat * Math.PI / 180)));
    
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('OpenSky API error:', response.statusText);
      return [];
    }

    const data: NearbyFlightsResponse = await response.json();
    
    if (!data.states || data.states.length === 0) {
      return [];
    }

    // Parse the state array into FlightData objects
    // OpenSky returns arrays with specific indices for each field
    const flights: FlightData[] = data.states
      .filter((state) => state[5] !== null && state[6] !== null) // Filter out flights without position
      .map((state) => ({
        icao24: String(state[0]),
        callsign: String(state[1] || '').trim(),
        originCountry: String(state[2]),
        timePosition: Number(state[3]),
        lastContact: Number(state[4]),
        longitude: Number(state[5]),
        latitude: Number(state[6]),
        baroAltitude: Number(state[7]),
        onGround: Boolean(state[8]),
        velocity: Number(state[9]),
        trueTrack: Number(state[10]),
        verticalRate: Number(state[11]),
        sensors: Array.isArray(state[12]) ? state[12] as number[] : [],
        geoAltitude: Number(state[13]),
        squawk: String(state[14]),
        spi: Boolean(state[15]),
        positionSource: Number(state[16]),
      }))
      .filter((flight) => flight.callsign && !flight.onGround); // Filter for airborne flights with callsigns

    return flights;
  } catch (error) {
    console.error('Error fetching nearby flights (likely CORS or network issue):', error);
    return [];
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getFlightIcon(heading: number): string {
  // Simple plane icon based on heading
  return '✈️';
}
