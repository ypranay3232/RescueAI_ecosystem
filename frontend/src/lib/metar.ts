// METAR data using NOAA Aviation Weather Center API (free, no API key required)

export interface METARData {
  stationId: string;
  observationTime: string;
  rawText: string;
  temperature: number;
  dewpoint: number;
  windDirection: number;
  windSpeed: number;
  windGust: number | null;
  visibility: number;
  cloudLayers: CloudLayer[];
  flightCategory: string;
  altimeter: number;
}

export interface CloudLayer {
  coverage: string;
  altitude: number;
  cloudType: string | null;
}

export async function fetchMETAR(stationCode: string): Promise<METARData | null> {
  try {
    // NOAA Aviation Weather Center API
    const url = `https://aviationweather.gov/api/data/metar?ids=${stationCode}&format=json&hours=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('METAR API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length === 0 || !data[0].rawText) {
      return null;
    }

    const metar = data[0];
    
    // Parse cloud layers
    const cloudLayers: CloudLayer[] = [];
    if (metar.cloudLayers) {
      metar.cloudLayers.forEach((layer: any) => {
        cloudLayers.push({
          coverage: layer.coverage || '',
          altitude: layer.base || 0,
          cloudType: layer.cloudType || null,
        });
      });
    }

    return {
      stationId: metar.stationId || stationCode,
      observationTime: metar.obsTime || '',
      rawText: metar.rawText || '',
      temperature: metar.temp || 0,
      dewpoint: metar.dewpoint || 0,
      windDirection: metar.wdir || 0,
      windSpeed: metar.wspd || 0,
      windGust: metar.wgst || null,
      visibility: metar.visib || 9999,
      cloudLayers,
      flightCategory: metar.flightCategory || 'VFR',
      altimeter: metar.altim || 29.92,
    };
  } catch (error) {
    console.error('Error fetching METAR (likely CORS or network issue):', error);
    return null;
  }
}

export function parseFlightCategory(category: string): string {
  const categories: Record<string, string> = {
    'VFR': 'Visual Flight Rules',
    'MVFR': 'Marginal VFR',
    'IFR': 'Instrument Flight Rules',
    'LIFR': 'Low IFR',
  };
  return categories[category] || category;
}

export function getFlightCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'VFR': '#22c55e',    // Green
    'MVFR': '#eab308',   // Yellow
    'IFR': '#f97316',    // Orange
    'LIFR': '#ef4444',   // Red
  };
  return colors[category] || '#64748b';
}

export function formatCloudLayers(layers: CloudLayer[]): string {
  if (!layers || layers.length === 0) return 'Clear';
  
  return layers.map(layer => {
    const altitude = layer.altitude > 0 ? `${layer.altitude}ft` : '';
    const type = layer.cloudType ? ` ${layer.cloudType}` : '';
    return `${layer.coverage}${altitude}${type}`;
  }).join(', ');
}
