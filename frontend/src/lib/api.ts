export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API error: ${res.status}`, errorText);
      throw new Error(`API error: ${res.status} - ${errorText || res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Request failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

export interface RecommendationResponse {
  summary?: string;
  actions?: Array<{
    priority: number;
    action: string;
    eta_minutes: number;
    resource: string;
  }>;
  risk_level?: string;
}

export interface SearchZoneResponse {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  confidence: number;
  priority_regions: Array<{
    name: string;
    lat: number;
    lng: number;
    priority: number;
    confidence: number;
  }>;
  reasoning?: string;
}

export const api = {
  health: () => request<{ status: string; ai_configured: boolean }>("/api/health"),

  searchZone: (data: Record<string, unknown>) =>
    request<SearchZoneResponse>("/api/ai/search-zone", { method: "POST", body: JSON.stringify(data) }),

  recommend: (scenario: Record<string, unknown>) =>
    request<RecommendationResponse>("/api/ai/recommend", { method: "POST", body: JSON.stringify({ scenario }) }),

  classifyRisk: (scenario: Record<string, unknown>) =>
    request("/api/ai/classify-risk", { method: "POST", body: JSON.stringify({ scenario }) }),

  analyzeImage: (file?: File, sample?: string, model = "yolo11n") => {
    const form = new FormData();
    if (file) {
      form.append("file", file);
    }
    const params = new URLSearchParams();
    params.append("model", model);
    if (sample) {
      params.append("sample", sample);
    }
    return request<{ filename: string; analysis: VisionAnalysis }>(`/api/vision/analyze?${params.toString()}`, {
      method: "POST",
      body: file ? form : undefined,
    });
  },

  weather: (lat = 34.152, lng = -118.243) =>
    request<WeatherData>(`/api/weather?lat=${lat}&lng=${lng}`),

  resources: () => request<ResourcesData>("/api/resources"),

  dispatchResource: (data: {
    resource_id: string;
    resource_type: string;
    status: string;
    location: string;
    eta_min?: number;
  }) =>
    request<{ status: string; resources: ResourcesData }>("/api/resources/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetResources: () =>
    request<{ status: string; resources: ResourcesData }>("/api/resources/reset", {
      method: "POST",
    }),

  evacuationPlan: (data: Record<string, unknown>) =>
    request<EvacuationPlanResponse>("/api/ai/evacuation-plan", { method: "POST", body: JSON.stringify(data) }),

  crashResponsePlan: (data: Record<string, unknown>) =>
    request<{
      summary: string;
      risk_assessment: string;
      steps: any[];
    }>("/api/ai/crash-response-plan", { method: "POST", body: JSON.stringify(data) }),

  obstacles: () => request<any[]>("/api/obstacles"),

  planRoute: (start: [number, number], end: [number, number]) =>
    request<any>("/api/route/plan", {
      method: "POST",
      body: JSON.stringify({ start, end }),
    }),

  triageList: () => request<any[]>("/api/resources/triage"),
};

export interface VisionAnalysis {
  detections: Array<{
    type: string;
    count: number;
    confidence: number;
    lat?: number;
    lng?: number;
  }>;
  victim_estimate: number;
  safe_landing_zones: Array<{ name: string; lat: number; lng: number; score: number }>;
  priority_areas: Array<{ name: string; priority: number; reason: string }>;
  annotated_url?: string;
  is_video?: boolean;
  model_used?: string;
}

export interface WeatherData {
  temp_c: number;
  wind_speed_ms: number;
  wind_deg: number;
  conditions: string;
  humidity: number;
  flood_risk: string;
  flight_safe: boolean;
  recommendation: string;
  forecast?: Array<{ hour: string; rain_mm: number; wind_ms: number }>;
}

export interface ResourcesData {
  teams: Array<{ id: string; name: string; status: string; location: string; members: number }>;
  ambulances: Array<{ id: string; name: string; status: string; eta_min: number; location: string }>;
  drones: Array<{ id: string; name: string; status: string; battery_pct: number; location?: string; reason?: string }>;
  supplies: Array<{ item: string; qty: number; status: string }>;
  updated_at: string;
}

export interface EvacuationPlanResponse {
  summary?: string;
  priority_actions?: Array<{
    priority: number;
    action: string;
    eta_minutes: number;
    resource: string;
  }>;
  risk_assessment?: string;
  volunteer_assignments?: Array<{
    volunteer_name: string;
    task: string;
    location: string;
  }>;
  supply_distribution?: Array<{
    source: string;
    destination: string;
    supplies: string;
  }>;
}

