"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface SurvivorVitals {
  heart_rate: number;
  temperature: number;
  blood_pressure: {
    systolic: number;
    diastolic: number;
  };
  oxygen_saturation: number;
  respiratory_rate: number;
  stress_level: number;
}

export interface SurvivorActivity {
  level: "active" | "limited" | "none";
  steps: number;
  calories_burned: number;
  speed: number;
  heading: number;
}

export interface SurvivorLocation {
  altitude: number;
  accuracy: number;
}

export interface SurvivorDevice {
  battery_level: number;
  signal_strength: number;
  device_temperature: number;
  uptime_hours: number;
}

export interface SurvivorAlerts {
  medical: string[];
  falls_detected: number;
  panic_button: boolean;
}

export interface SurvivorHistory {
  heart_rate: number[];
  temperature: number[];
  oxygen_saturation: number[];
}

export interface SurvivorData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "green" | "yellow" | "red";
  vitals: SurvivorVitals;
  activity: SurvivorActivity;
  location: SurvivorLocation;
  device: SurvivorDevice;
  alerts: SurvivorAlerts;
  history: SurvivorHistory;
  last_update: string;
}

export interface WebSocketMessage {
  type: "initial" | "update";
  timestamp?: string;
  survivors: SurvivorData[];
  drones?: any[];
  base_station?: any;
  mesh_links?: any[];
  paths?: any;
}

export function useSurvivorWebSocket() {
  const [survivors, setSurvivors] = useState<SurvivorData[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [baseStation, setBaseStation] = useState<any>(null);
  const [meshLinks, setMeshLinks] = useState<any[]>([]);
  const [paths, setPaths] = useState<any>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usePolling, setUsePolling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSurvivors = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/survivors`);
      if (response.ok) {
        const data = await response.json();
        setSurvivors(data);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error("Polling error:", err);
      setError("Failed to fetch survivor data");
    }
  }, []);

  const startPolling = useCallback(() => {
    console.log("Switching to polling mode");
    setUsePolling(true);
    setIsConnected(true);
    fetchSurvivors(); // Initial fetch
    pollingIntervalRef.current = setInterval(fetchSurvivors, 2000); // Poll every 2 seconds
  }, [fetchSurvivors]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setUsePolling(false);
  }, []);

  const connect = useCallback(() => {
    // Stop any existing polling before connecting
    stopPolling();
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsUrl = apiUrl.replace("http", "ws") + "/api/ws/survivors";
      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        if (ws !== wsRef.current) return;
        setIsConnected(true);
        setError(null);
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        if (ws !== wsRef.current) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === "initial" || message.type === "update") {
            setSurvivors(message.survivors);
            if (message.drones) setDrones(message.drones);
            if (message.base_station) setBaseStation(message.base_station);
            if (message.mesh_links) setMeshLinks(message.mesh_links);
            if (message.paths) setPaths(message.paths);
            setLastUpdate(new Date());
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        if (ws !== wsRef.current) return;
        console.error("WebSocket error:", event);
        setError("Connection error");
      };

      ws.onclose = () => {
        if (ws !== wsRef.current) return;
        setIsConnected(false);
        console.log("WebSocket disconnected");
        
        // Switch to polling after WebSocket disconnects
        setUsePolling(prev => {
          if (!prev) {
            startPolling();
          }
          return true;
        });
        
        // Attempt to reconnect after 10 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          stopPolling();
          connect();
        }, 10000);
      };
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to connect");
      // If WebSocket fails, start polling
      startPolling();
    }
  }, [startPolling, stopPolling]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();
  }, [stopPolling]);

  const triggerPanic = useCallback(async (survivorId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/survivors/${survivorId}/panic`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to trigger panic");
      }
      return await response.json();
    } catch (err) {
      console.error("Error triggering panic:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    survivors,
    drones,
    baseStation,
    meshLinks,
    paths,
    isConnected,
    lastUpdate,
    error,
    triggerPanic,
  };
}
