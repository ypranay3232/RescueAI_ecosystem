"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/layout/app-header";
import { RescueMap } from "@/components/maps/rescue-map";
import { AirportPicker } from "@/components/search/airport-picker";
import { PingModal } from "@/components/search/ping-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, MapPin, Cloud, Wind, Droplets, Plane, Loader2, Brain, AlertTriangle, CheckCircle2, Crosshair, Building2, ShieldAlert, Flame, Radio, Globe, Layers, Clock, Download, FileText } from "lucide-react";
import type { SearchZoneResponse, RecommendationResponse } from "@/lib/api";
import type { SearchZone } from "@/lib/mock-data";
import type { EmergencyService, MapTileStyle } from "@/components/maps/rescue-map";
import { api } from "@/lib/api";
import { fetchEmergencyServices } from "@/lib/overpass";
import { fetchWeather, getWeatherDescription, getWeatherIcon, fetchWeatherForecast, getSunTimes, type WeatherData, type WeatherForecast } from "@/lib/weather";
import { fetchNearbyFlights, calculateDistance, type FlightData } from "@/lib/flights";
import { fetchElevation, formatElevation, metersToFeet, type ElevationData } from "@/lib/elevation";
import { fetchMETAR, parseFlightCategory, getFlightCategoryColor, formatCloudLayers, type METARData } from "@/lib/metar";
import { AIRPORTS, getCountries, getAirportsByCountry, searchAirports, type Airport } from "@/lib/airports";
import {
  getFlightTarget,
  hasReachedPoint,
  shouldAcceptCrashSelection,
} from "@/lib/crash-location";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { MissionTimeline } from "@/components/search/mission-timeline";
import type { TimelineEvent } from "@/components/search/mission-timeline";

interface CrashScenario {
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

interface FlightState {
  status: "idle" | "flying" | "signal_lost" | "calculating";
  currentPosition: [number, number];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  speed: number;
  altitude: number;
  heading: number;
  fuelRemaining: number;
  route: [number, number][];
  lkp?: {
    lat: number;
    lng: number;
    altitude: number;
    speed: number;
    heading: number;
    fuelRemaining: number;
    timestamp: string;
  };
  searchZone?: SearchZone;
  weather?: {
    temp_c: number;
    wind_speed_ms: number;
    conditions: string;
    humidity: number;
    flood_risk: string;
    flight_safe: boolean;
    recommendation: string;
  };
  startAirport?: Airport;
  endAirport?: Airport;
  flightMode: "airport" | "signal_lost" | "custom";
  signalLostLocation?: { lat: number; lng: number };
  customStartLocation?: { lat: number; lng: number; name: string };
  customEndLocation?: { lat: number; lng: number; name: string };
  crashScenarios?: CrashScenario[];
}

export default function SearchPage() {
  const [flight, setFlight] = useState<FlightState>({
    status: "idle",
    currentPosition: [0, 0],
    startLat: 0,
    startLng: 0,
    endLat: 0,
    endLng: 0,
    speed: 450,
    altitude: 35000,
    heading: 0,
    fuelRemaining: 100,
    route: [],
    flightMode: "airport",
    crashScenarios: [],
    customStartLocation: undefined,
    customEndLocation: undefined,
  });

  const [startSearch, setStartSearch] = useState("");
  const [endSearch, setEndSearch] = useState("");
  const [startCountry, setStartCountry] = useState("");
  const [endCountry, setEndCountry] = useState("");
  const [startResults, setStartResults] = useState<Airport[]>([]);
  const [endResults, setEndResults] = useState<Airport[]>([]);
  const [showStartResults, setShowStartResults] = useState(false);
  const [showEndResults, setShowEndResults] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [selectingCrashLocation, setSelectingCrashLocation] = useState(false);
  const [manualCrashLocation, setManualCrashLocation] = useState<{ lat: number; lng: number } | null>(null);

  // AI analysis state
  const [aiSearchZone, setAiSearchZone] = useState<SearchZoneResponse | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<RecommendationResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Emergency services overlay state
  const [emergencyServices, setEmergencyServices] = useState<EmergencyService[]>([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showEmergencyServices, setShowEmergencyServices] = useState(true);

  // Weather data state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);

  // Nearby flights state
  const [nearbyFlights, setNearbyFlights] = useState<FlightData[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);

  // Elevation data state
  const [elevationData, setElevationData] = useState<ElevationData | null>(null);

  // METAR data state
  const [metarData, setMetarData] = useState<METARData | null>(null);

  // Ping modal
  const [pingTarget, setPingTarget] = useState<EmergencyService | null>(null);

  // 3D Globe + HUD + Timeline
  const [showGlobe, setShowGlobe]                 = useState(false);
  const [tileStyle, setTileStyle]                 = useState<MapTileStyle>("dark");
  const [flightProgress, setFlightProgress]       = useState(0);
  const [timelineEvents, setTimelineEvents]       = useState<TimelineEvent[]>([]);
  const [showTimeline, setShowTimeline]           = useState(false);

  const countries = useMemo(() => getCountries(), []);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualCrashLocationRef = useRef(manualCrashLocation);
  const crashTriggeredRef = useRef(false);
  const progressRef = useRef(0);

  useEffect(() => {
    manualCrashLocationRef.current = manualCrashLocation;
  }, [manualCrashLocation]);

  // Helper to append a timeline event
  const addEvent = useCallback((
    type: TimelineEvent["type"],
    label: string,
    detail?: string,
    status?: TimelineEvent["status"]
  ) => {
    setTimelineEvents((prev) => [
      ...prev,
      { id: `${type}-${Date.now()}`, type, label, detail, timestamp: new Date(), status },
    ]);
  }, []);

  const handleStartSearch = useCallback((value: string) => {
    setStartSearch(value);
    if (!startCountry) {
      setStartResults([]);
      setShowStartResults(false);
      return;
    }
    setStartResults(searchAirports(startCountry, value));
    setShowStartResults(true);
  }, [startCountry]);

  const handleEndSearch = useCallback((value: string) => {
    setEndSearch(value);
    if (!endCountry) {
      setEndResults([]);
      setShowEndResults(false);
      return;
    }
    setEndResults(searchAirports(endCountry, value));
    setShowEndResults(true);
  }, [endCountry]);

  const handleStartCountryChange = useCallback((country: string) => {
    setStartCountry(country);
    setStartSearch("");
    setStartResults(getAirportsByCountry(country));
    setShowStartResults(true);
    setFlight((prev) => {
      if (prev.startAirport?.country === country) return prev;
      return { ...prev, startAirport: undefined, startLat: 0, startLng: 0 };
    });
  }, []);

  const handleEndCountryChange = useCallback((country: string) => {
    setEndCountry(country);
    setEndSearch("");
    setEndResults(getAirportsByCountry(country));
    setShowEndResults(true);
    setFlight((prev) => {
      if (prev.endAirport?.country === country) return prev;
      return { ...prev, endAirport: undefined, endLat: 0, endLng: 0 };
    });
  }, []);

  const markCrashLocation = useCallback((lat: number, lng: number) => {
    setManualCrashLocation({ lat, lng });
    setSelectingCrashLocation(false);
    toast.success(`Crash location marked at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }, []);

  const handleMapRightClick = useCallback((lat: number, lng: number) => {
    if (shouldAcceptCrashSelection(selectingCrashLocation, flight.status)) {
      markCrashLocation(lat, lng);
    }
  }, [selectingCrashLocation, flight.status, markCrashLocation]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (shouldAcceptCrashSelection(selectingCrashLocation, flight.status)) {
      markCrashLocation(lat, lng);
      return;
    }

    if (flight.flightMode === "custom") {
      if (!flight.customStartLocation) {
        setFlight({
          ...flight,
          customStartLocation: { lat, lng, name: `Custom (${lat.toFixed(4)}, ${lng.toFixed(4)})` },
          startLat: lat,
          startLng: lng,
        });
      } else if (!flight.customEndLocation) {
        setFlight({
          ...flight,
          customEndLocation: { lat, lng, name: `Custom (${lat.toFixed(4)}, ${lng.toFixed(4)})` },
          endLat: lat,
          endLng: lng,
        });
      }
    }
  }, [selectingCrashLocation, flight.status, markCrashLocation, flight]);

  const selectStartAirport = (airport: Airport) => {
    setStartCountry(airport.country);
    setFlight({
      ...flight,
      startLat: airport.lat,
      startLng: airport.lng,
      startAirport: airport,
    });
    setStartSearch(`${airport.code} - ${airport.city}`);
    setShowStartResults(false);
    
    // METAR API disabled due to CORS issues - would need backend proxy
    // fetchMETAR(airport.code).then((metar) => {
    //   if (metar) {
    //     setMetarData(metar);
    //     addEvent("metar_update", "Departure METAR Retrieved",
    //       `${airport.code}: ${parseFlightCategory(metar.flightCategory)}`
    //     );
    //   }
    // });
  };

  const selectEndAirport = (airport: Airport) => {
    setEndCountry(airport.country);
    setFlight({
      ...flight,
      endLat: airport.lat,
      endLng: airport.lng,
      endAirport: airport,
    });
    setEndSearch(`${airport.code} - ${airport.city}`);
    setShowEndResults(false);
  };

  const calculateCrashScenarios = (lkp: FlightState['lkp'], destinationLat?: number, destinationLng?: number) => {
    if (!lkp) return [];

    const altitudeFt = lkp.altitude;
    const speedKnots = lkp.speed;
    const fuelRemaining = lkp.fuelRemaining;

    const altitudeKm = altitudeFt * 0.0003048;
    const speedKmh = speedKnots * 1.852;

    // Calculate distance to destination if provided
    let maxAllowedDistance = 200; // Default cap
    if (destinationLat && destinationLng) {
      const R = 6371;
      const dLat = (destinationLat - lkp.lat) * Math.PI / 180;
      const dLng = (destinationLng - lkp.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lkp.lat * Math.PI / 180) * Math.cos(destinationLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      maxAllowedDistance = R * c;
    }

    // Immediate crash area - small circle around LKP
    const immediateCrashRadius = 5; // 5km
    
    // Gliding area - based on altitude (glide ratio ~15:1)
    const glideDistance = Math.min(altitudeKm * 15, 50, maxAllowedDistance); // Cap at 50km or destination
    
    // Powered flight range - limited fuel, capped to prevent covering entire map
    const fuelDistance = Math.min(fuelRemaining * speedKmh * 0.05, 100, maxAllowedDistance); // Reduced multiplier, capped at 100km or destination
    
    // Maximum range - combined, but limited to not exceed destination
    const maxDistance = Math.min(Math.max(glideDistance, fuelDistance), maxAllowedDistance);

    const scenarios: CrashScenario[] = [];

    scenarios.push({
      id: "immediate-crash",
      name: "Immediate Crash Area",
      description: "Aircraft crashed near LKP due to catastrophic failure",
      probability: 0.25,
      center: [lkp.lat, lkp.lng],
      radiusKm: immediateCrashRadius,
      color: "#ef4444",
      factors: {
        maxDistance: immediateCrashRadius,
        glideRatio: 0,
        fuelRange: 0,
      },
    });

    scenarios.push({
      id: "glide-landing",
      name: "Glide Area",
      description: "Aircraft glided to landing within glide ratio",
      probability: 0.35,
      center: [lkp.lat, lkp.lng],
      radiusKm: glideDistance,
      color: "#f97316",
      factors: {
        maxDistance: glideDistance,
        glideRatio: 15,
        fuelRange: 0,
      },
    });

    scenarios.push({
      id: "powered-flight",
      name: "Powered Flight Range",
      description: "Aircraft continued on remaining fuel",
      probability: 0.25,
      center: [lkp.lat, lkp.lng],
      radiusKm: fuelDistance,
      color: "#eab308",
      factors: {
        maxDistance: fuelDistance,
        glideRatio: 0,
        fuelRange: fuelDistance,
      },
    });

    scenarios.push({
      id: "maximum-range",
      name: "Safe Area",
      description: "Combined glide and fuel range scenario",
      probability: 0.15,
      center: [lkp.lat, lkp.lng],
      radiusKm: maxDistance,
      color: "#22c55e",
      factors: {
        maxDistance: maxDistance,
        glideRatio: 15,
        fuelRange: fuelDistance,
      },
    });

    return scenarios;
  };

  const applySignalLostAt = useCallback((lat: number, lng: number) => {
    setFlight((prev) => ({ ...prev, status: "calculating", currentPosition: [lat, lng] }));
    setShowProcessingOverlay(true);
    addEvent("signal_lost", "Signal Lost", `LKP: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, "warning");

    requestAnimationFrame(() => {
      setTimeout(() => {
        setFlight((prev) => {
          const lkpData = {
            lat,
            lng,
            altitude: prev.altitude,
            speed: prev.speed,
            heading: prev.heading,
            fuelRemaining: prev.fuelRemaining,
            timestamp: new Date().toISOString(),
          };

          const maxFlightTime = (prev.fuelRemaining / 100) * 4;
          const maxDistance = (prev.speed * maxFlightTime * 1.852) / 2;
          const radiusKm = Math.max(5, Math.min(maxDistance, 50));
          const headingRad = prev.heading * (Math.PI / 180);
          const priorityRegions = [
            {
              name: "Primary Search Area",
              lat: lkpData.lat + Math.sin(headingRad) * (radiusKm * 0.5 / 111),
              lng: lkpData.lng + Math.cos(headingRad) * (radiusKm * 0.5 / 111),
              priority: 1,
              confidence: 0.85,
            },
            {
              name: "Secondary Area - Left",
              lat: lkpData.lat + Math.sin(headingRad - 0.5) * (radiusKm * 0.3 / 111),
              lng: lkpData.lng + Math.cos(headingRad - 0.5) * (radiusKm * 0.3 / 111),
              priority: 2,
              confidence: 0.65,
            },
            {
              name: "Secondary Area - Right",
              lat: lkpData.lat + Math.sin(headingRad + 0.5) * (radiusKm * 0.3 / 111),
              lng: lkpData.lng + Math.cos(headingRad + 0.5) * (radiusKm * 0.3 / 111),
              priority: 3,
              confidence: 0.55,
            },
          ];
          const scenarios = calculateCrashScenarios(lkpData, prev.endLat, prev.endLng);

          setTimeout(() => {
            setShowProcessingOverlay(false);
            addEvent("search_initiated", "Search Protocol Activated",
              `Search radius: ${radiusKm.toFixed(1)} km · ${scenarios.length} crash scenarios modelled`
            );
            
            // Fetch weather data for crash location
            fetchWeatherForecast(lat, lng).then((forecast) => {
              if (forecast) {
                setWeatherData(forecast.current);
                setWeatherForecast(forecast);
                const sunTimes = getSunTimes(forecast);
                addEvent("weather_update", "Weather Data Retrieved",
                  `Temp: ${forecast.current.temperature.toFixed(1)}°C · Wind: ${forecast.current.windSpeed.toFixed(1)} km/h${sunTimes ? ` · Sunrise: ${sunTimes.sunrise}` : ''}`
                );
              }
            });
            
            // Fetch nearby flights for potential assistance
            // OpenSky API disabled due to CORS issues - would need backend proxy
            // fetchNearbyFlights(lat, lng, 200).then((flights) => {
            //   if (flights.length > 0) {
            //     setNearbyFlights(flights);
            //     addEvent("nearby_flights", "Nearby Aircraft Detected",
            //       `${flights.length} aircraft within 200km`
            //     );
            //   }
            // });
            
            // Fetch elevation data for crash location
            fetchElevation(lat, lng).then((elevation) => {
              if (elevation) {
                setElevationData(elevation);
                addEvent("elevation_data", "Elevation Data Retrieved",
                  `${formatElevation(elevation.elevation)} above sea level`
                );
              }
            });
          }, 2500);

          return {
            ...prev,
            status: "signal_lost",
            currentPosition: [lat, lng],
            lkp: lkpData,
            searchZone: {
              center: [lkpData.lat, lkpData.lng],
              radiusKm,
              confidence: Math.min(0.95, 0.5 + (prev.fuelRemaining / 200)),
              priorityRegions,
            },
            crashScenarios: scenarios,
          };
        });
      }, 0);
    });
  }, []);

  useEffect(() => {
    if (flight.status === "flying") {
      let animationFrameId: number;
      let lastTime = performance.now();
      
      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        setFlight((prev) => {
          const [currentLat, currentLng] = prev.currentPosition;
          const flightTarget = getFlightTarget(
            manualCrashLocationRef.current,
            prev.endLat,
            prev.endLng
          );
          const targetLat = flightTarget.lat;
          const targetLng = flightTarget.lng;
          
          const totalDistance = Math.sqrt(
            Math.pow(targetLat - prev.startLat, 2) +
            Math.pow(targetLng - prev.startLng, 2)
          );
          const distanceTraveled = Math.sqrt(
            Math.pow(currentLat - prev.startLat, 2) +
            Math.pow(currentLng - prev.startLng, 2)
          );
          
          if (distanceTraveled >= totalDistance * 0.99) {
            if (manualCrashLocationRef.current) {
              return {
                ...prev,
                currentPosition: [targetLat, targetLng],
              };
            }

            return { 
              ...prev, 
              status: "idle",
              currentPosition: [targetLat, targetLng]
            };
          }

          const progress = distanceTraveled / totalDistance;
          const speedFactor = 0.001 * (deltaTime / 16.67);
          const newProgress = Math.min(progress + speedFactor, 0.99);
          const newLat = prev.startLat + (targetLat - prev.startLat) * newProgress;
          const newLng = prev.startLng + (targetLng - prev.startLng) * newProgress;
          const newFuel = Math.max(0, prev.fuelRemaining - 0.02);

          const newHeading = Math.atan2(
            targetLng - prev.startLng,
            targetLat - prev.startLat
          ) * (180 / Math.PI);

          // Communicate progress out of the updater via ref
          progressRef.current = newProgress;

          return {
            ...prev,
            currentPosition: [newLat, newLng],
            fuelRemaining: newFuel,
            heading: newHeading,
          };
        });

        // Update globe progress (read from ref, safe outside updater)
        setFlightProgress(progressRef.current);
        
        if (flight.status === "flying") {
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      
      animationFrameId = requestAnimationFrame(animate);
      
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [flight.status, applySignalLostAt]);

  useEffect(() => {
    if (flight.status !== "flying" || !manualCrashLocation || crashTriggeredRef.current) return;

    const [lat, lng] = flight.currentPosition;
    if (lat === 0 && lng === 0) return;

    if (hasReachedPoint({ lat, lng }, manualCrashLocation)) {
      crashTriggeredRef.current = true;
      applySignalLostAt(manualCrashLocation.lat, manualCrashLocation.lng);
    }
  }, [flight.currentPosition, flight.status, manualCrashLocation, applySignalLostAt]);

  useEffect(() => {
    if (flight.lkp && !flight.weather) {      api.weather(flight.lkp.lat, flight.lkp.lng).then((weatherData) => {
        setFlight((prev) => ({ ...prev, weather: weatherData }));
      }).catch(() => {
        setFlight((prev) => ({
          ...prev,
          weather: {
            temp_c: 18.5,
            wind_speed_ms: 12.4,
            conditions: "partly cloudy",
            humidity: 72,
            flood_risk: "medium",
            flight_safe: false,
            recommendation: "High wind conditions — monitor search operations closely.",
          },
        }));
      });
    }
  }, [flight.lkp, flight.weather]);

  // AI analysis: fire search-zone + recommend calls once when LKP is established
  useEffect(() => {
    if (!flight.lkp || aiSearchZone || aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    const lkp = flight.lkp;
    const minutesSinceContact = 5; // default; could be tracked with a timer

    Promise.all([
      api.searchZone({
        last_lat: lkp.lat,
        last_lng: lkp.lng,
        speed_knots: lkp.speed,
        heading_deg: lkp.heading,
        altitude_ft: lkp.altitude,
        minutes_since_contact: minutesSinceContact,
        weather: flight.weather?.conditions ?? "unknown",
      }),
      api.recommend({
        type: "aircraft_search_rescue",
        lkp_lat: lkp.lat,
        lkp_lng: lkp.lng,
        altitude_ft: lkp.altitude,
        speed_knots: lkp.speed,
        heading_deg: lkp.heading,
        fuel_remaining_pct: lkp.fuelRemaining,
        minutes_since_contact: minutesSinceContact,
        weather: flight.weather?.conditions ?? "unknown",
        wind_speed_ms: flight.weather?.wind_speed_ms ?? 0,
      }),
    ])
      .then(([zone, rec]) => {
        setAiSearchZone(zone);
        setAiRecommendation(rec);
        addEvent("ai_analysis", "AI Analysis Complete",
          `Predicted zone: ${zone.radius_km.toFixed(1)} km radius · ${rec.risk_level?.toUpperCase()} risk`,
          "done"
        );
      })
      .catch((err) => {
        console.error("AI analysis failed:", err);
        setAiError("AI analysis unavailable — showing local estimates.");
      })
      .finally(() => setAiLoading(false));
  }, [flight.lkp, aiSearchZone, aiLoading, flight.weather]);

  // Emergency services: fetch real OSM POIs once when LKP is set
  useEffect(() => {
    if (!flight.lkp || emergencyServices.length > 0 || emergencyLoading) return;
    setEmergencyLoading(true);
    fetchEmergencyServices(flight.lkp.lat, flight.lkp.lng, 30)
      .then((services) => {
        setEmergencyServices(services);
        if (services.length > 0) {
          const counts = {
            hospital: services.filter((s) => s.type === "hospital").length,
            police: services.filter((s) => s.type === "police").length,
            fire_station: services.filter((s) => s.type === "fire_station").length,
          };
          const parts = [
            counts.hospital > 0 && `${counts.hospital} hospital${counts.hospital > 1 ? "s" : ""}`,
            counts.police > 0 && `${counts.police} police station${counts.police > 1 ? "s" : ""}`,
            counts.fire_station > 0 && `${counts.fire_station} fire station${counts.fire_station > 1 ? "s" : ""}`,
          ].filter(Boolean);
          toast.success(`Found nearby: ${parts.join(", ")}`);
          addEvent("services_alerted", "Emergency Services Located",
            parts.join(", ") + " found within 30 km",
            "done"
          );
        }
      })
      .finally(() => setEmergencyLoading(false));
  }, [flight.lkp, emergencyServices.length, emergencyLoading]);

  const handlePingClose = useCallback((sent?: boolean) => {
    if (sent && pingTarget) {
      addEvent("ping_sent", `Alert Sent — ${pingTarget.name}`,
        `${pingTarget.type === "hospital" ? "🏥" : pingTarget.type === "police" ? "🚔" : "🚒"} Emergency alert transmitted`,
        "done"
      );
    }
    setPingTarget(null);
  }, [pingTarget, addEvent]); 

  const canPlanFlight = flight.flightMode === "airport"
    ? flight.startAirport && flight.endAirport
    : flight.flightMode === "signal_lost"
    ? flight.startAirport && flight.signalLostLocation
    : flight.customStartLocation && flight.customEndLocation;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Space") {
        e.preventDefault();
        if (flight.status === "idle" && canPlanFlight) {
          startFlight();
        } else if (flight.status === "flying") {
          loseSignal();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (flight.status !== "idle") {
          resetFlight();
        }
      } else if (e.key === "l" || e.key === "L") {
        if (flight.status === "flying") {
          loseSignal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [flight.status, canPlanFlight, flight]);

  const startFlight = () => {
    if (!flight.startLat || !flight.startLng) {
      alert(flight.flightMode === "custom" 
        ? "Please click on map to select start location" 
        : "Please select a departure airport first");
      return;
    }

    const endLat = flight.flightMode === "signal_lost" && flight.signalLostLocation
      ? flight.signalLostLocation.lat
      : flight.flightMode === "custom" && flight.customEndLocation
      ? flight.customEndLocation.lat
      : flight.endLat;
    const endLng = flight.flightMode === "signal_lost" && flight.signalLostLocation
      ? flight.signalLostLocation.lng
      : flight.flightMode === "custom" && flight.customEndLocation
      ? flight.customEndLocation.lng
      : flight.endLng;

    if (!endLat || !endLng) {
      alert(flight.flightMode === "signal_lost" 
        ? "Please enter signal lost coordinates" 
        : flight.flightMode === "custom"
        ? "Please click on map to select end location"
        : "Please select a destination airport");
      return;
    }

    if (flight.speed <= 0 || flight.speed > 1000) {
      alert("Please enter a valid speed (1-1000 knots)");
      return;
    }

    if (flight.altitude <= 0 || flight.altitude > 60000) {
      alert("Please enter a valid altitude (1-60000 ft)");
      return;
    }

    crashTriggeredRef.current = false;
    setFlightProgress(0);
    setFlight({
      ...flight,
      status: "flying",
      currentPosition: [flight.startLat, flight.startLng],
      route: [[flight.startLat, flight.startLng]],
      endLat,
      endLng,
    });
    addEvent("flight_start", "Flight Departed",
      `${flight.startAirport?.code ?? "Custom"} → ${flight.endAirport?.code ?? "Destination"} · ${flight.altitude.toLocaleString()} ft · ${flight.speed} kts`,
      "active"
    );
  };

  const loseSignal = () => {
    applySignalLostAt(flight.currentPosition[0], flight.currentPosition[1]);
  };

  const resetFlight = () => {
    setFlight({
      status: "idle",
      currentPosition: [0, 0],
      startLat: 0,
      startLng: 0,
      endLat: 0,
      endLng: 0,
      speed: 450,
      altitude: 35000,
      heading: 0,
      fuelRemaining: 100,
      route: [],
      startAirport: undefined,
      endAirport: undefined,
      flightMode: "airport",
      signalLostLocation: undefined,
      crashScenarios: [],
      customStartLocation: undefined,
      customEndLocation: undefined,
    });
    setStartSearch("");
    setEndSearch("");
    setStartCountry("");
    setEndCountry("");
    setManualCrashLocation(null);
    setSelectingCrashLocation(false);
    setAiSearchZone(null);
    setAiRecommendation(null);
    setAiError(null);
    setEmergencyServices([]);
    setEmergencyLoading(false);
    setTimelineEvents([]);
    setFlightProgress(0);
    setShowGlobe(false);
    setShowTimeline(false);
    crashTriggeredRef.current = false;
  };

  const calculateFlightDistance = useCallback(() => {
    const startLat = flight.startLat;
    const startLng = flight.startLng;
    const endLat = flight.endLat;
    const endLng = flight.endLng;
    
    if (startLat === 0 || startLng === 0 || endLat === 0 || endLng === 0) return 0;
    
    const R = 6371;
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLng = (endLng - startLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [flight.startLat, flight.startLng, flight.endLat, flight.endLng]);

  const flightDistance = useMemo(() => calculateFlightDistance(), [calculateFlightDistance]);
  const estimatedTime = useMemo(() => flightDistance > 0 && flight.speed > 0 ? (flightDistance / (flight.speed * 1.852)) : 0, [flightDistance, flight.speed]);

  const flightTarget = useMemo(
    () => getFlightTarget(manualCrashLocation, flight.endLat, flight.endLng),
    [manualCrashLocation, flight.endLat, flight.endLng]
  );

  const mapRoutes = useMemo(() => {
    if (!flight.startLat || !flight.startLng || !flight.endLat || !flight.endLng) {
      return [];
    }

    const primaryRoute = {
      id: "planned-route",
      name: manualCrashLocation
        ? "Route to crash incident"
        : flight.status === "flying"
          ? "Flight Path"
          : "Planned Route",
      color: flight.status === "signal_lost" ? "#ef4444" : (flight.status === "flying" ? "#3b82f6" : "#6366f1"),
      waypoints: [[flight.startLat, flight.startLng], [flightTarget.lat, flightTarget.lng]] as [number, number][],
    };

    if (!manualCrashLocation) {
      return [primaryRoute];
    }

    return [
      primaryRoute,
      {
        id: "remaining-route",
        name: "Remaining route to destination",
        color: "#64748b",
        waypoints: [[manualCrashLocation.lat, manualCrashLocation.lng], [flight.endLat, flight.endLng]] as [number, number][],
      },
    ];
  }, [flight.startLat, flight.startLng, flight.endLat, flight.endLng, flight.status, flightTarget, manualCrashLocation]);

  const mapMarkers = useMemo(() => {
    const markers: Array<{
      lat: number;
      lng: number;
      color?: string;
      label?: string;
      popup?: string;
    }> = [];

    if (flight.startLat && flight.startLng && flight.status === "idle") {
      markers.push({
        lat: flight.startLat,
        lng: flight.startLng,
        color: "#22c55e",
        popup: flight.startAirport ? `Departure: ${flight.startAirport.code}` : "Departure",
      });
    }

    if (flight.endLat && flight.endLng && flight.status === "idle") {
      markers.push({
        lat: flight.endLat,
        lng: flight.endLng,
        color: "#6366f1",
        popup: flight.endAirport ? `Destination: ${flight.endAirport.code}` : "Destination",
      });
    }

    if (flight.currentPosition[0] !== 0 && flight.currentPosition[1] !== 0) {
      markers.push({
        lat: flight.currentPosition[0],
        lng: flight.currentPosition[1],
        color: flight.status === "signal_lost" ? "#ef4444" : "#3b82f6",
        label: "Current Position",
      });
    }

    return markers;
  }, [
    flight.startLat,
    flight.startLng,
    flight.endLat,
    flight.endLng,
    flight.status,
    flight.startAirport,
    flight.endAirport,
    flight.currentPosition,
  ]);

  // ── Incident report export ────────────────────────────────────────────────
  const exportIncidentReport = useCallback(() => {
    if (!flight.lkp) return;
    const lines: string[] = [
      "═══════════════════════════════════════════════════════",
      "        RESCUEOS AI — INCIDENT REPORT",
      "═══════════════════════════════════════════════════════",
      `Generated: ${new Date().toLocaleString()} UTC`,
      "",
      "── FLIGHT DETAILS ──────────────────────────────────────",
      `Departure : ${flight.startAirport ? `${flight.startAirport.code} — ${flight.startAirport.name}` : `${flight.startLat.toFixed(5)}, ${flight.startLng.toFixed(5)}`}`,
      `Destination: ${flight.endAirport ? `${flight.endAirport.code} — ${flight.endAirport.name}` : `${flight.endLat.toFixed(5)}, ${flight.endLng.toFixed(5)}`}`,
      `Speed     : ${flight.speed} knots`,
      `Altitude  : ${flight.altitude.toLocaleString()} ft`,
      "",
      "── LAST KNOWN POSITION (LKP) ───────────────────────────",
      `Latitude  : ${flight.lkp.lat.toFixed(6)}`,
      `Longitude : ${flight.lkp.lng.toFixed(6)}`,
      `Altitude  : ${flight.lkp.altitude.toLocaleString()} ft`,
      `Speed     : ${flight.lkp.speed} knots`,
      `Heading   : ${flight.lkp.heading.toFixed(1)}°`,
      `Fuel      : ${flight.lkp.fuelRemaining}%`,
      `Timestamp : ${new Date(flight.lkp.timestamp).toLocaleString()}`,
      "",
      "── SEARCH ZONE ─────────────────────────────────────────",
      flight.searchZone
        ? [
            `Radius    : ${flight.searchZone.radiusKm.toFixed(1)} km`,
            `Confidence: ${(flight.searchZone.confidence * 100).toFixed(0)}%`,
            `Sectors   : ${flight.searchZone.priorityRegions.map((r) => `${r.name} (P${r.priority})`).join(", ")}`,
          ].join("\n")
        : "Not calculated",
      "",
      "── AI ANALYSIS ─────────────────────────────────────────",
      aiSearchZone
        ? `Zone: ${aiSearchZone.center_lat.toFixed(5)}, ${aiSearchZone.center_lng.toFixed(5)} · r=${aiSearchZone.radius_km.toFixed(1)} km · ${(aiSearchZone.confidence * 100).toFixed(0)}% confidence`
        : "Not available",
      aiRecommendation?.summary ? `Summary: ${aiRecommendation.summary}` : "",
      aiRecommendation?.risk_level ? `Risk Level: ${aiRecommendation.risk_level.toUpperCase()}` : "",
      "",
      "── EMERGENCY SERVICES ──────────────────────────────────",
      ...(emergencyServices.filter((s) => s.isNearest).map((s) =>
        `${s.type === "hospital" ? "🏥" : s.type === "police" ? "🚔" : "🚒"} ${s.name}${s.roadDistanceKm ? ` · ${s.roadDistanceKm.toFixed(1)} km road · ETA ${s.etaMinutes} min` : ` · ~${s.distanceKm.toFixed(1)} km`}${s.phone ? ` · ${s.phone}` : ""}`
      )),
      "",
      "── WEATHER AT SEARCH AREA ──────────────────────────────",
      flight.weather
        ? `${flight.weather.conditions} · Wind ${flight.weather.wind_speed_ms.toFixed(1)} m/s · Temp ${flight.weather.temp_c.toFixed(1)}°C · Flood risk: ${flight.weather.flood_risk} · Flight safe: ${flight.weather.flight_safe ? "Yes" : "No"}`
        : "Not available",
      "",
      "── MISSION TIMELINE ────────────────────────────────────",
      ...timelineEvents.map((e) => `[${e.timestamp.toLocaleTimeString()}] ${e.label}${e.detail ? ` — ${e.detail}` : ""}`),
      "",
      "═══════════════════════════════════════════════════════",
      "                  END OF REPORT",
      "═══════════════════════════════════════════════════════",
    ];

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rescueos-incident-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Incident report downloaded");
  }, [flight, aiSearchZone, aiRecommendation, emergencyServices, timelineEvents]);

  return (
    <>
      <AppHeader title="Aircraft Search & Rescue" subtitle="Flight simulation and search zone estimation" />

      {/* Ping modal — rendered at root so it overlays everything */}
      <PingModal
        service={pingTarget}
        crashLat={flight.lkp?.lat}
        crashLng={flight.lkp?.lng}
        onClose={handlePingClose}
      />

      <AnimatePresence>
        {showProcessingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="text-center space-y-4"
          >
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
              <div className="absolute inset-0 border-4 border-primary rounded-full animate-spin" />
              <Plane className="absolute inset-0 m-auto h-8 w-8 text-primary animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Processing Signal Loss</h3>
              <p className="text-muted-foreground">Calculating crash scenarios and fetching rescue resources…</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Please wait</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
      
      <div className={`flex-1 overflow-auto p-6 transition-opacity duration-300 ${showProcessingOverlay ? 'opacity-30' : ''}`}>
        {/* ── Top toolbar strip ─────────────────────────────────────────── */}
        {flight.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            {/* Tile style picker */}
            <div className="flex items-center gap-1 rounded-xl p-1"
              style={{ background: "oklch(0.12 0.014 265)", border: "1px solid oklch(1 0 0 / 0.07)" }}>
              <Layers className="h-3.5 w-3.5 ml-2 mr-1" style={{ color: "oklch(1 0 0 / 0.4)" }} />
              {(["dark", "satellite", "terrain", "light"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setTileStyle(style)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all"
                  style={tileStyle === style ? {
                    background: "oklch(0.72 0.18 44)",
                    color: "#fff",
                  } : {
                    color: "oklch(1 0 0 / 0.5)",
                  }}
                >
                  {style}
                </button>
              ))}
            </div>

            {/* Globe toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGlobe((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              style={showGlobe ? {
                background: "linear-gradient(135deg, oklch(0.72 0.18 44 / 0.25), oklch(0.72 0.18 44 / 0.12))",
                border: "1px solid oklch(0.72 0.18 44 / 0.4)",
                color: "oklch(0.85 0.18 44)",
              } : {
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.07)",
                color: "oklch(1 0 0 / 0.5)",
              }}
            >
              <Globe className="h-3.5 w-3.5" />
              3D Globe
            </motion.button>

            {/* Timeline toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTimeline((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              style={showTimeline ? {
                background: "linear-gradient(135deg, oklch(0.55 0.18 280 / 0.25), oklch(0.55 0.18 280 / 0.12))",
                border: "1px solid oklch(0.55 0.18 280 / 0.4)",
                color: "oklch(0.75 0.18 280)",
              } : {
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.07)",
                color: "oklch(1 0 0 / 0.5)",
              }}
            >
              <Clock className="h-3.5 w-3.5" />
              Timeline
              {timelineEvents.length > 0 && (
                <span className="rounded-full px-1.5 text-[9px] font-bold"
                  style={{ background: "oklch(0.55 0.18 280 / 0.3)", color: "oklch(0.75 0.18 280)" }}>
                  {timelineEvents.length}
                </span>
              )}
            </motion.button>

            {/* Export */}
            {flight.lkp && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={exportIncidentReport}
                className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                style={{
                  background: "oklch(0.12 0.014 265)",
                  border: "1px solid oklch(1 0 0 / 0.07)",
                  color: "oklch(1 0 0 / 0.5)",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Export Report
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── 3D Globe panel ─────────────────────────────────────────────── */}
        {/* Temporarily disabled due to React version conflicts */}
        {/* <AnimatePresence>
          {showGlobe && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-2xl"
              style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}
            >
              <EarthGlobe
                height="320px"
                startLat={flight.startLat || undefined}
                startLng={flight.startLng || undefined}
                endLat={flight.endLat || undefined}
                endLng={flight.endLng || undefined}
                crashLat={flight.lkp?.lat}
                crashLng={flight.lkp?.lng}
                flightProgress={flightProgress}
                signalLost={flight.status === "signal_lost"}
              />
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* ── Timeline panel ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showTimeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-2xl p-4"
              style={{
                background: "oklch(0.12 0.014 265)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              <MissionTimeline events={timelineEvents} maxHeight="280px" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-500">
          <Card className="border-border/60 transition-all duration-300 hover:shadow-lg">            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Route Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{AIRPORTS.length} airports across {countries.length} countries</p>
                <p className="mt-1">Select country, then pick an airport for departure and destination.</p>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <p><kbd className="px-1.5 py-0.5 bg-background border rounded">Space</kbd> Start/Lose Signal</p>
                <p><kbd className="px-1.5 py-0.5 bg-background border rounded">L</kbd> Lose Signal</p>
                <p><kbd className="px-1.5 py-0.5 bg-background border rounded">R</kbd> Reset Flight</p>
              </div>
              <div className="flex gap-2">
                {(["airport", "signal_lost", "custom"] as const).map((mode) => (
                  <motion.div key={mode} className="flex-1" whileTap={{ scale: 0.93 }}>
                    <Button
                      variant={flight.flightMode === mode ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => setFlight({
                        ...flight,
                        flightMode: mode,
                        endAirport: undefined,
                        signalLostLocation: undefined,
                        customStartLocation: undefined,
                        customEndLocation: undefined,
                        ...(mode === "custom" ? { startAirport: undefined } : {}),
                      })}
                    >
                      {mode === "airport" ? "Airport → Airport" : mode === "signal_lost" ? "Signal Lost" : "Custom"}
                    </Button>
                  </motion.div>
                ))}
              </div>

              <AirportPicker
                label="Departure"
                countries={countries}
                country={startCountry}
                onCountryChange={handleStartCountryChange}
                search={startSearch}
                onSearchChange={handleStartSearch}
                results={startResults}
                showResults={showStartResults}
                onSelect={selectStartAirport}
                onSearchFocus={() => {
                  if (startCountry) {
                    setStartResults(searchAirports(startCountry, startSearch));
                    setShowStartResults(true);
                  }
                }}
                selectedAirport={flight.startAirport}
                disabled={flight.status !== "idle"}
              />

              {flight.flightMode === "airport" ? (
                <AirportPicker
                  label="Destination"
                  countries={countries}
                  country={endCountry}
                  onCountryChange={handleEndCountryChange}
                  search={endSearch}
                  onSearchChange={handleEndSearch}
                  results={endResults}
                  showResults={showEndResults}
                  onSelect={selectEndAirport}
                  onSearchFocus={() => {
                    if (endCountry) {
                      setEndResults(searchAirports(endCountry, endSearch));
                      setShowEndResults(true);
                    }
                  }}
                  selectedAirport={flight.endAirport}
                  disabled={flight.status !== "idle"}
                />
              ) : flight.flightMode === "signal_lost" ? (
                <div className="space-y-1.5">
                  <Label>Signal Lost Location</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Latitude"
                      value={flight.signalLostLocation?.lat || ""}
                      onChange={(e) => setFlight({
                    ...flight,
                    signalLostLocation: {
                      ...flight.signalLostLocation,
                      lat: parseFloat(e.target.value) || 0,
                      lng: flight.signalLostLocation?.lng || 0
                    }
                  })}
                    />
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Longitude"
                      value={flight.signalLostLocation?.lng || ""}
                      onChange={(e) => setFlight({
                    ...flight,
                    signalLostLocation: {
                      ...flight.signalLostLocation,
                      lat: flight.signalLostLocation?.lat || 0,
                      lng: parseFloat(e.target.value) || 0
                    }
                  })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">📍 Click on map to select locations</p>
                    <p className="text-muted-foreground">First click: Start location</p>
                    <p className="text-muted-foreground">Second click: End location</p>
                  </div>
                  {flight.customStartLocation && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Start:</span>{" "}
                      <span className="font-medium">{flight.customStartLocation.name}</span>
                    </div>
                  )}
                  {flight.customEndLocation && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">End:</span>{" "}
                      <span className="font-medium">{flight.customEndLocation.name}</span>
                    </div>
                  )}
                </div>
              )}

              {canPlanFlight && (
                <>
                  <div className="border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xs text-muted-foreground">Manual Crash Location</Label>
                      <Button
                        variant={selectingCrashLocation ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectingCrashLocation(!selectingCrashLocation)}
                        className="transition-all duration-300 hover:scale-105 active:scale-95"
                        disabled={flight.status === "signal_lost" || flight.status === "calculating"}
                      >
                        <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                        {selectingCrashLocation ? "Cancel" : "Select on Map"}
                      </Button>
                    </div>
                    {selectingCrashLocation && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {flight.status === "flying"
                          ? "Click on the map while the flight is in progress — the plane will fly to that point and crash there."
                          : "Click on the map to mark the crash incident site. The flight will stop there."}
                      </p>
                    )}
                    {manualCrashLocation && (
                      <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs">
                        <p className="font-medium text-red-400">Crash incident marked</p>
                        <p className="text-muted-foreground">
                          {manualCrashLocation.lat.toFixed(4)}, {manualCrashLocation.lng.toFixed(4)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 px-2"
                          onClick={() => setManualCrashLocation(null)}
                        >
                          Clear mark
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-border/60 pt-4">
                    <Label className="text-xs text-muted-foreground mb-3 block">Flight Parameters</Label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Distance</Label>
                          <p className="text-sm font-medium">{flightDistance > 0 ? `${flightDistance.toFixed(0)} km` : "—"}</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Est. Time</Label>
                          <p className="text-sm font-medium">{estimatedTime > 0 ? `${estimatedTime.toFixed(1)} hrs` : "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Speed (knots)</Label>
                        <Input
                          type="number"
                          value={flight.speed}
                          onChange={(e) => setFlight({ ...flight, speed: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Altitude (ft)</Label>
                        <Input
                          type="number"
                          value={flight.altitude}
                          onChange={(e) => setFlight({ ...flight, altitude: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                      <Button
                        className="w-full"
                        onClick={startFlight}
                        disabled={flight.status === "flying" || flight.status === "signal_lost"}
                      >
                        {flight.status === "flying" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Flying...</>
                        ) : (
                          <><Play className="mr-2 h-4 w-4" />Start Flight</>
                        )}
                      </Button>
                    </motion.div>
                    <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={loseSignal}
                        disabled={flight.status === "idle" || flight.status === "signal_lost" || flight.status === "calculating"}
                      >
                        {flight.status === "calculating" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating...</>
                        ) : (
                          <><Square className="mr-2 h-4 w-4" />Lose Signal</>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button className="w-full" variant="outline" onClick={resetFlight}>
                      Reset Simulation
                    </Button>
                  </motion.div>
                </>
              )}

              {!canPlanFlight && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Select country and airport for both departure and destination
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border-border/60 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Flight Route
                  <AnimatePresence mode="wait">
                    {flight.status === "flying" && (
                      <motion.span key="flying" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">IN FLIGHT</motion.span>
                    )}
                    {flight.status === "signal_lost" && (
                      <motion.span key="lost" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">SIGNAL LOST</motion.span>
                    )}
                  </AnimatePresence>
                  {flight.lkp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto">
                      <Button
                        variant={showEmergencyServices ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setShowEmergencyServices((v) => !v)}
                      >
                        <Radio className="h-3 w-3" />
                        {emergencyLoading ? "Loading…" : `Services${emergencyServices.length > 0 ? ` (${emergencyServices.length})` : ""}`}
                      </Button>
                    </motion.div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RescueMap
                  center={
                    flight.status !== "idle" && flight.currentPosition[0] !== 0
                      ? flight.currentPosition
                      : flight.startLat && flight.startLng
                        ? [flight.startLat, flight.startLng]
                        : [34.0522, -118.2437]
                  }
                  routes={mapRoutes}
                  markers={mapMarkers}
                  searchZone={flight.searchZone}
                  showHeatmap={!!flight.searchZone}
                  height="500px"
                  onMapClick={handleMapClick}
                  onMapRightClick={handleMapRightClick}
                  crashScenarios={flight.crashScenarios}
                  selectingCrashLocation={selectingCrashLocation}
                  crashLocation={flight.status === "signal_lost" ? null : manualCrashLocation}
                  emergencyServices={showEmergencyServices ? emergencyServices : []}
                  onPingService={(svc) => setPingTarget(svc)}
                />
              </CardContent>
            </Card>
            
            {/* Weather Card */}
            {weatherData && (
              <Card className="border-border/60 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Weather Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Temperature</p>
                      <p className="font-medium">{weatherData.temperature.toFixed(1)}°C</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Wind Speed</p>
                      <p className="font-medium">{weatherData.windSpeed.toFixed(1)} km/h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Wind Direction</p>
                      <p className="font-medium">{weatherData.windDirection.toFixed(0)}°</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Humidity</p>
                      <p className="font-medium">{weatherData.humidity}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conditions</p>
                      <p className="font-medium">{getWeatherIcon(weatherData.weatherCode, weatherData.isDay)} {getWeatherDescription(weatherData.weatherCode)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Visibility</p>
                      <p className="font-medium">{weatherData.visibility} km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Day/Night</p>
                      <p className="font-medium">{weatherData.isDay ? '☀️ Day' : '🌙 Night'}</p>
                    </div>
                    {elevationData && (
                      <div>
                        <p className="text-muted-foreground">Elevation</p>
                        <p className="font-medium">{formatElevation(elevationData.elevation)} ({metersToFeet(elevationData.elevation).toFixed(0)} ft)</p>
                      </div>
                    )}
                    {weatherForecast && (() => {
                      const sunTimes = getSunTimes(weatherForecast);
                      return sunTimes ? (
                        <div>
                          <p className="text-muted-foreground">Sunrise/Sunset</p>
                          <p className="font-medium">☀️ {sunTimes.sunrise} / 🌙 {sunTimes.sunset}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Nearby Flights Card */}
            {nearbyFlights.length > 0 && (
              <Card className="border-border/60 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Nearby Aircraft ({nearbyFlights.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {nearbyFlights.slice(0, 10).map((flight) => {
                      const crashLat = flight.latitude;
                      const crashLng = flight.longitude;
                      const distance = calculateDistance(crashLat, crashLng, flight.latitude, flight.longitude);
                      return (
                        <div key={flight.icao24} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{flight.callsign}</span>
                            <span className="text-muted-foreground">{flight.originCountry}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{distance.toFixed(1)} km</div>
                            <div className="text-muted-foreground">
                              {flight.velocity ? `${(flight.velocity * 3.6).toFixed(0)} km/h` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* METAR Card */}
            {metarData && (
              <Card className="border-border/60 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    METAR - {metarData.stationId}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-muted/30 text-xs font-mono">
                      {metarData.rawText}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Flight Category</p>
                        <p className="font-medium" style={{ color: getFlightCategoryColor(metarData.flightCategory) }}>
                          {parseFlightCategory(metarData.flightCategory)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Wind</p>
                        <p className="font-medium">{metarData.windDirection}° @ {metarData.windSpeed} kts{metarData.windGust ? ` G${metarData.windGust}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Visibility</p>
                        <p className="font-medium">{metarData.visibility >= 9999 ? '>10km' : `${metarData.visibility}m`}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Clouds</p>
                        <p className="font-medium">{formatCloudLayers(metarData.cloudLayers)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Temp/Dew</p>
                        <p className="font-medium">{metarData.temperature}°C / {metarData.dewpoint}°C</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altimeter</p>
                        <p className="font-medium">{metarData.altimeter.toFixed(2)} inHg</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="border-border/60 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Flight Telemetry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{flight.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Speed</p>
                    <p className="font-medium">{flight.speed} knots</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Altitude</p>
                    <p className="font-medium">{flight.altitude.toLocaleString()} ft</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel</p>
                    <p className="font-medium">{flight.fuelRemaining}%</p>
                  </div>
                  {flight.status !== "idle" && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Current Lat</p>
                        <p className="font-medium">{flight.currentPosition[0].toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Lng</p>
                        <p className="font-medium">{flight.currentPosition[1].toFixed(4)}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {flight.lkp && (
              <motion.div
                key="lkp"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
              <Card className="border-red-500/30 bg-red-500/5 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-400">⚠️ Last Known Position (LKP) — Signal Lost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Latitude</p><p className="font-medium">{flight.lkp.lat.toFixed(6)}</p></div>
                    <div><p className="text-muted-foreground">Longitude</p><p className="font-medium">{flight.lkp.lng.toFixed(6)}</p></div>
                    <div><p className="text-muted-foreground">Altitude</p><p className="font-medium">{flight.lkp.altitude.toLocaleString()} ft</p></div>
                    <div><p className="text-muted-foreground">Speed</p><p className="font-medium">{flight.lkp.speed} knots</p></div>
                    <div><p className="text-muted-foreground">Heading</p><p className="font-medium">{flight.lkp.heading.toFixed(1)}°</p></div>
                    <div><p className="text-muted-foreground">Fuel Remaining</p><p className="font-medium">{flight.lkp.fuelRemaining}%</p></div>
                    <div className="col-span-2 md:col-span-3"><p className="text-muted-foreground">Timestamp</p><p className="font-medium">{new Date(flight.lkp.timestamp).toLocaleString()}</p></div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {flight.crashScenarios && flight.crashScenarios.length > 0 && (
              <motion.div
                key="scenarios"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
              <Card className="border-border/60 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Crash Scenario Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {flight.crashScenarios.map((scenario, i) => (
                      <motion.div
                        key={scenario.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.3 }}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border/50"
                      >
                        <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: scenario.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm">{scenario.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{Math.round(scenario.probability * 100)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><p className="text-muted-foreground">Max Distance</p><p className="font-medium">{scenario.factors.maxDistance.toFixed(1)} km</p></div>
                            <div><p className="text-muted-foreground">Glide Ratio</p><p className="font-medium">{scenario.factors.glideRatio > 0 ? `${scenario.factors.glideRatio}:1` : "N/A"}</p></div>
                            <div><p className="text-muted-foreground">Fuel Range</p><p className="font-medium">{scenario.factors.fuelRange > 0 ? `${scenario.factors.fuelRange.toFixed(1)} km` : "N/A"}</p></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {flight.searchZone && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}>
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-400">🎯 Calculated Search Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Search Radius</p><p className="font-medium">{flight.searchZone.radiusKm.toFixed(1)} km</p></div>
                    <div><p className="text-muted-foreground">Confidence</p><p className="font-medium">{(flight.searchZone.confidence * 100).toFixed(0)}%</p></div>
                    <div><p className="text-muted-foreground">Priority Areas</p><p className="font-medium">{flight.searchZone.priorityRegions.length} sectors</p></div>
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-muted-foreground mb-2">Priority Regions</p>
                      <div className="space-y-1">
                        {flight.searchZone.priorityRegions.map((region) => (
                          <div key={region.name} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-xs">
                            <span>{region.name}</span>
                            <span className="text-orange-400">P{region.priority} · {(region.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {flight.weather && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}>
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Weather Conditions at Search Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2"><Cloud className="h-4 w-4 text-blue-400" /><div><p className="text-muted-foreground text-xs">Conditions</p><p className="font-medium capitalize">{flight.weather.conditions}</p></div></div>
                    <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-cyan-400" /><div><p className="text-muted-foreground text-xs">Wind</p><p className="font-medium">{flight.weather.wind_speed_ms.toFixed(1)} m/s</p></div></div>
                    <div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-400" /><div><p className="text-muted-foreground text-xs">Humidity</p><p className="font-medium">{flight.weather.humidity}%</p></div></div>
                    <div><p className="text-muted-foreground text-xs">Temperature</p><p className="font-medium">{flight.weather.temp_c.toFixed(1)}°C</p></div>
                    <div><p className="text-muted-foreground text-xs">Flood Risk</p><p className={`font-medium capitalize ${flight.weather.flood_risk === "high" ? "text-red-400" : flight.weather.flood_risk === "medium" ? "text-yellow-400" : "text-green-400"}`}>{flight.weather.flood_risk}</p></div>
                    <div><p className="text-muted-foreground text-xs">Flight Safe</p><p className={`font-medium ${flight.weather.flight_safe ? "text-green-400" : "text-red-400"}`}>{flight.weather.flight_safe ? "Yes" : "No"}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground text-xs">Recommendation</p><p className="font-medium text-xs">{flight.weather.recommendation}</p></div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* AI Loading State */}
            {aiLoading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  <div>
                    <p className="text-sm font-medium">AI Analysis Running</p>
                    <p className="text-xs text-muted-foreground">Calculating search zone and rescue priorities...</p>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* AI error (non-blocking) */}
            {aiError && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-yellow-300">{aiError}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7 flex-shrink-0" onClick={() => { setAiError(null); setAiSearchZone(null); setAiRecommendation(null); }}>Retry</Button>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* AI Search Zone */}
            {aiSearchZone && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}>
              <Card className="border-purple-500/30 bg-purple-500/5 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Predicted Search Zone
                    <span className="ml-auto text-xs font-normal bg-purple-500/20 px-2 py-0.5 rounded-full">{(aiSearchZone.confidence * 100).toFixed(0)}% confidence</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div><p className="text-muted-foreground text-xs">Center Lat</p><p className="font-medium">{aiSearchZone.center_lat.toFixed(5)}</p></div>
                    <div><p className="text-muted-foreground text-xs">Center Lng</p><p className="font-medium">{aiSearchZone.center_lng.toFixed(5)}</p></div>
                    <div><p className="text-muted-foreground text-xs">Search Radius</p><p className="font-medium">{aiSearchZone.radius_km.toFixed(1)} km</p></div>
                  </div>
                  {aiSearchZone.priority_regions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground mb-2">Priority Sectors</p>
                      {aiSearchZone.priority_regions.map((r) => (
                        <div key={r.name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.priority >= 5 ? "#ef4444" : r.priority === 4 ? "#f97316" : r.priority === 3 ? "#eab308" : r.priority === 2 ? "#22c55e" : "#3b82f6" }} />
                            <span className="font-medium">{r.name}</span>
                          </div>
                          <span className="text-purple-400">P{r.priority} · {(r.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiSearchZone.reasoning && (
                    <div className="mt-3 rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">AI Reasoning</p>
                      <p>{aiSearchZone.reasoning}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* AI Recommendation */}
            {aiRecommendation && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}>
              <Card className="border-emerald-500/30 bg-emerald-500/5 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    AI Rescue Recommendations
                    {aiRecommendation.risk_level && (
                      <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full ${aiRecommendation.risk_level === "critical" ? "bg-red-500/20 text-red-400" : aiRecommendation.risk_level === "high" ? "bg-orange-500/20 text-orange-400" : aiRecommendation.risk_level === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                        {aiRecommendation.risk_level?.toUpperCase()} RISK
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiRecommendation.summary && <p className="text-sm text-muted-foreground mb-4">{aiRecommendation.summary}</p>}
                  {aiRecommendation.actions && aiRecommendation.actions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Prioritised Actions</p>
                      {aiRecommendation.actions.map((action, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${action.priority === 1 ? "bg-red-500/20 text-red-400" : action.priority === 2 ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>{action.priority}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{action.action}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{action.resource}</span>
                              {action.eta_minutes > 0 && <span className="text-emerald-400">ETA {action.eta_minutes} min</span>}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* Emergency Services Legend + Summary */}
            {emergencyServices.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55, ease: "easeOut" }}>
              <Card className="border-slate-500/30 bg-slate-500/5 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-slate-400" />
                    Nearby Emergency Services
                    <span className="ml-auto text-xs font-normal text-muted-foreground">within 30 km · real OSM data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-pink-400" /><span className="text-muted-foreground">Hospital</span></div>
                    <div className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-blue-400" /><span className="text-muted-foreground">Police</span></div>
                    <div className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-400" /><span className="text-muted-foreground">Fire Station</span></div>
                  </div>

                  {/* Nearest 1 per category — with road ETA + Ping */}
                  <div className="space-y-3 mb-4">
                    {(["hospital", "police", "fire_station"] as const).map((type) => {
                      const nearest = emergencyServices.find((s) => s.type === type && s.isNearest);
                      if (!nearest) return null;
                      const icon = type === "hospital"
                        ? <Building2 className="h-4 w-4 text-pink-400 flex-shrink-0" />
                        : type === "police"
                        ? <ShieldAlert className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        : <Flame className="h-4 w-4 text-orange-400 flex-shrink-0" />;
                      const borderColor = type === "hospital" ? "border-pink-500/30" : type === "police" ? "border-blue-500/30" : "border-orange-500/30";
                      const bgColor    = type === "hospital" ? "bg-pink-500/5"    : type === "police" ? "bg-blue-500/5"   : "bg-orange-500/5";
                      return (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: type === "hospital" ? 0.6 : type === "police" ? 0.7 : 0.8 }}
                          className={`rounded-xl border ${borderColor} ${bgColor} p-3`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {icon}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{nearest.name}</p>
                                {nearest.address && (
                                  <p className="text-xs text-muted-foreground truncate">{nearest.address}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                              NEAREST
                            </span>
                          </div>

                          {/* Distance + ETA row */}
                          <div className="flex items-center gap-3 text-xs mb-2.5">
                            {nearest.roadDistanceKm != null ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                🚗 {nearest.roadDistanceKm.toFixed(1)} km · {nearest.etaMinutes} min
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                ~{nearest.distanceKm.toFixed(1)} km straight-line
                              </span>
                            )}
                            {nearest.phone && (
                              <a
                                href={`tel:${nearest.phone}`}
                                className="flex items-center gap-1 text-blue-400 hover:underline ml-auto"
                              >
                                📞 {nearest.phone}
                              </a>
                            )}
                          </div>

                          {/* Ping button */}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPingTarget(nearest)}
                            className="w-full flex items-center justify-center gap-2 rounded-lg
                                       bg-red-500/15 border border-red-500/30 text-red-400
                                       text-xs font-semibold py-2 hover:bg-red-500/25
                                       transition-colors duration-150"
                          >
                            <Radio className="h-3.5 w-3.5" />
                            Send Emergency Alert
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Count summary */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(["hospital", "police", "fire_station"] as const).map((type) => {
                      const count = emergencyServices.filter((s) => s.type === type).length;
                      const icon = type === "hospital"
                        ? <Building2 className="h-4 w-4 text-pink-400" />
                        : type === "police"
                        ? <ShieldAlert className="h-4 w-4 text-blue-400" />
                        : <Flame className="h-4 w-4 text-orange-400" />;
                      const label = type === "hospital" ? "Hospitals" : type === "police" ? "Police" : "Fire";
                      return (
                        <div key={type} className="rounded-lg bg-muted/20 p-2 text-center">
                          <div className="flex justify-center mb-0.5">{icon}</div>
                          <p className="text-base font-bold">{count}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Closest 5 overall */}
                  <p className="text-xs text-muted-foreground mb-2">All nearby facilities</p>
                  <div className="space-y-1.5">
                    {[...emergencyServices]
                      .sort((a, b) => a.distanceKm - b.distanceKm)
                      .slice(0, 6)
                      .map((svc, i) => {
                        const icon = svc.type === "hospital"
                          ? <Building2 className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                          : svc.type === "police"
                          ? <ShieldAlert className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                          : <Flame className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />;
                        return (
                          <motion.div
                            key={svc.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 * i }}
                            className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2 text-xs group hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setPingTarget(svc)}
                          >
                            {icon}
                            <span className="flex-1 font-medium truncate">{svc.name}</span>
                            {svc.roadDistanceKm != null ? (
                              <span className="text-emerald-400 flex-shrink-0 font-semibold">
                                {svc.roadDistanceKm.toFixed(1)} km
                              </span>
                            ) : (
                              <span className="text-muted-foreground flex-shrink-0">
                                ~{svc.distanceKm.toFixed(1)} km
                              </span>
                            )}
                            <Radio className="h-3 w-3 text-muted-foreground group-hover:text-red-400 transition-colors flex-shrink-0" />
                          </motion.div>
                        );
                      })}
                  </div>

                  {!showEmergencyServices && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 text-xs"
                      onClick={() => setShowEmergencyServices(true)}
                    >
                      Show on Map
                    </Button>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
