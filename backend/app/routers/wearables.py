from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import json
import asyncio
import random
from datetime import datetime, timedelta
import math

router = APIRouter()

# Enhanced survivor data model with comprehensive vitals
class SurvivorData:
    def __init__(self, survivor_id: str, name: str, lat: float, lng: float, initial_status: str = "green"):
        self.id = survivor_id
        self.name = name
        self.lat = lat
        self.lng = lng
        self.status = initial_status
        
        # Core vitals
        self.heart_rate = random.randint(60, 100)
        self.temperature = round(random.uniform(36.0, 37.5), 1)
        self.blood_pressure_systolic = random.randint(110, 140)
        self.blood_pressure_diastolic = random.randint(70, 90)
        self.oxygen_saturation = random.randint(95, 100)
        self.respiratory_rate = random.randint(12, 20)
        
        # Advanced metrics
        self.stress_level = random.randint(0, 100)
        self.activity_level = random.choice(["active", "limited", "none"])
        self.steps = random.randint(0, 5000)
        self.calories_burned = random.randint(100, 500)
        
        # Device status
        self.battery_level = random.randint(80, 100)
        self.signal_strength = random.randint(3, 5)
        self.device_temperature = round(random.uniform(25.0, 35.0), 1)
        
        # Location tracking
        self.altitude = random.randint(100, 500)
        self.speed = random.uniform(0, 5.0)
        self.heading = random.randint(0, 360)
        
        # Medical alerts
        self.falls_detected = 0
        self.panic_button_pressed = False
        self.medical_alerts = []
        
        # Timestamps
        self.last_update = datetime.now()
        self.device_uptime = timedelta(hours=random.randint(1, 48))
        
        # Historical data for charts (last 20 readings)
        self.heart_rate_history = [self.heart_rate] * 20
        self.temperature_history = [self.temperature] * 20
        self.oxygen_history = [self.oxygen_saturation] * 20

    def update_vitals(self) -> Dict[str, Any]:
        """Simulate realistic vital sign changes"""
        # Heart rate fluctuation (more realistic patterns)
        hr_change = random.randint(-5, 5)
        self.heart_rate = max(40, min(180, self.heart_rate + hr_change))
        
        # Temperature changes slowly
        temp_change = random.uniform(-0.2, 0.2)
        self.temperature = round(max(35.0, min(40.0, self.temperature + temp_change)), 1)
        
        # Blood pressure variations
        self.blood_pressure_systolic = max(90, min(180, self.blood_pressure_systolic + random.randint(-3, 3)))
        self.blood_pressure_diastolic = max(50, min(120, self.blood_pressure_diastolic + random.randint(-2, 2)))
        
        # Oxygen saturation (usually stable, drops with issues)
        if random.random() < 0.05:  # 5% chance of significant change
            self.oxygen_saturation = max(85, min(100, self.oxygen_saturation + random.randint(-2, 2)))
        
        # Respiratory rate
        self.respiratory_rate = max(8, min(30, self.respiratory_rate + random.randint(-1, 1)))
        
        # Stress level based on heart rate and other factors
        base_stress = (self.heart_rate - 60) / 1.2
        self.stress_level = max(0, min(100, int(base_stress + random.randint(-10, 10))))
        
        # Activity level changes
        if random.random() < 0.1:  # 10% chance of activity change
            self.activity_level = random.choice(["active", "limited", "none"])
        
        # Battery drain simulation
        self.battery_level = max(0, self.battery_level - random.uniform(0.1, 0.5))
        
        # Signal fluctuation
        if random.random() < 0.15:  # 15% chance of signal change
            self.signal_strength = max(1, min(5, self.signal_strength + random.choice([-1, 1])))
        
        # Movement simulation (GPS drift)
        if self.activity_level == "active":
            self.lat += random.uniform(-0.0001, 0.0001)
            self.lng += random.uniform(-0.0001, 0.0001)
            self.speed = random.uniform(1.0, 5.0)
        elif self.activity_level == "limited":
            self.lat += random.uniform(-0.00005, 0.00005)
            self.lng += random.uniform(-0.00005, 0.00005)
            self.speed = random.uniform(0.1, 1.0)
        else:
            self.speed = random.uniform(0, 0.1)
        
        # Update heading
        if self.speed > 0.1:
            self.heading = (self.heading + random.randint(-10, 10)) % 360
        
        # Update historical data
        self.heart_rate_history.append(self.heart_rate)
        self.heart_rate_history.pop(0)
        
        self.temperature_history.append(self.temperature)
        self.temperature_history.pop(0)
        
        self.oxygen_history.append(self.oxygen_saturation)
        self.oxygen_history.pop(0)
        
        # Update status based on vitals
        self._update_status()
        
        # Update timestamp
        self.last_update = datetime.now()
        
        return self.to_dict()

    def _update_status(self):
        """Determine survivor status based on vitals"""
        critical_conditions = []
        warning_conditions = []
        
        # Check critical conditions
        if self.heart_rate > 140 or self.heart_rate < 50:
            critical_conditions.append("abnormal_heart_rate")
        if self.temperature > 39.0 or self.temperature < 35.5:
            critical_conditions.append("extreme_temperature")
        if self.oxygen_saturation < 90:
            critical_conditions.append("low_oxygen")
        if self.blood_pressure_systolic > 160 or self.blood_pressure_systolic < 90:
            critical_conditions.append("critical_blood_pressure")
        if self.panic_button_pressed:
            critical_conditions.append("panic_button")
        
        # Check warning conditions
        if 120 <= self.heart_rate <= 140 or 50 <= self.heart_rate <= 55:
            warning_conditions.append("elevated_heart_rate")
        if 37.6 <= self.temperature <= 39.0 or 35.5 <= self.temperature < 36.0:
            warning_conditions.append("elevated_temperature")
        if 90 <= self.oxygen_saturation < 95:
            warning_conditions.append("reduced_oxygen")
        if self.battery_level < 20:
            warning_conditions.append("low_battery")
        if self.signal_strength < 2:
            warning_conditions.append("weak_signal")
        if self.activity_level == "none" and self.heart_rate < 55:
            warning_conditions.append("reduced_activity")
        
        # Update medical alerts
        self.medical_alerts = critical_conditions + warning_conditions
        
        # Set overall status
        if critical_conditions:
            self.status = "red"
        elif warning_conditions:
            self.status = "yellow"
        else:
            self.status = "green"

    def to_dict(self) -> Dict[str, Any]:
        """Convert survivor data to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "status": self.status,
            "vitals": {
                "heart_rate": self.heart_rate,
                "temperature": self.temperature,
                "blood_pressure": {
                    "systolic": self.blood_pressure_systolic,
                    "diastolic": self.blood_pressure_diastolic
                },
                "oxygen_saturation": self.oxygen_saturation,
                "respiratory_rate": self.respiratory_rate,
                "stress_level": self.stress_level
            },
            "activity": {
                "level": self.activity_level,
                "steps": self.steps,
                "calories_burned": self.calories_burned,
                "speed": round(self.speed, 2),
                "heading": self.heading
            },
            "location": {
                "altitude": self.altitude,
                "accuracy": round(random.uniform(5.0, 20.0), 1)
            },
            "device": {
                "battery_level": round(self.battery_level, 1),
                "signal_strength": self.signal_strength,
                "device_temperature": self.device_temperature,
                "uptime_hours": self.device_uptime.total_seconds() / 3600
            },
            "alerts": {
                "medical": self.medical_alerts,
                "falls_detected": self.falls_detected,
                "panic_button": self.panic_button_pressed
            },
            "history": {
                "heart_rate": self.heart_rate_history,
                "temperature": self.temperature_history,
                "oxygen_saturation": self.oxygen_history
            },
            "last_update": self.last_update.isoformat()
        }


# Initialize survivor data
survivors = [
    SurvivorData("W1", "Survivor Alpha", 34.159, -118.237, "yellow"),
    SurvivorData("W2", "Survivor Beta", 34.161, -118.252, "green"),
    SurvivorData("W3", "Survivor Gamma", 34.148, -118.261, "red"),
    SurvivorData("W4", "Survivor Delta", 34.155, -118.245, "green"),
    SurvivorData("W5", "Survivor Echo", 34.162, -118.238, "yellow"),
]

drones = [
    {"id": "D1", "name": "Drone Alpha", "lat": 34.155, "lng": -118.240, "status": "active"},
    {"id": "D2", "name": "Drone Beta", "lat": 34.160, "lng": -118.255, "status": "active"},
]

base_station = {
    "id": "BASE",
    "name": "Command Center",
    "lat": 34.150,
    "lng": -118.250,
    "status": "gateway"
}

def calculate_mesh():
    # Update drone positions slightly (drift/fly simulation)
    for d in drones:
        d["lat"] += random.uniform(-0.00015, 0.00015)
        d["lng"] += random.uniform(-0.00015, 0.00015)
    
    # List of all nodes with coordinates
    all_nodes = {}
    for s in survivors:
        all_nodes[s.id] = {"lat": s.lat, "lng": s.lng, "type": "survivor", "name": s.name}
    for d in drones:
        all_nodes[d["id"]] = {"lat": d["lat"], "lng": d["lng"], "type": "drone", "name": d["name"]}
    all_nodes[base_station["id"]] = {"lat": base_station["lat"], "lng": base_station["lng"], "type": "base", "name": base_station["name"]}
    
    # Calculate connections based on distance threshold
    # 0.012 degrees threshold (~1.3km) for local link
    THRESHOLD = 0.012
    links = []
    adj = {node_id: [] for node_id in all_nodes}
    
    node_ids = list(all_nodes.keys())
    for i in range(len(node_ids)):
        for j in range(i + 1, len(node_ids)):
            id1, id2 = node_ids[i], node_ids[j]
            n1, n2 = all_nodes[id1], all_nodes[id2]
            dist = math.sqrt((n1["lat"] - n2["lat"])**2 + (n1["lng"] - n2["lng"])**2)
            if dist <= THRESHOLD:
                quality = int((1.0 - (dist / THRESHOLD)) * 100)
                quality = max(10, min(100, quality))
                links.append({
                    "from": id1,
                    "to": id2,
                    "distance": round(dist * 111, 2), # km approx
                    "quality": quality
                })
                adj[id1].append(id2)
                adj[id2].append(id1)
                
    # BFS to find shortest path to BASE
    paths = {}
    queue = [["BASE"]]
    visited = {"BASE"}
    while queue:
        path = queue.pop(0)
        curr = path[-1]
        paths[curr] = path[::-1] # Path from curr to BASE (e.g. ['W1', 'D1', 'BASE'])
        for neighbor in adj[curr]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])
                
    # For nodes that have no path to BASE, their path is just [node_id]
    for node_id in all_nodes:
        if node_id not in paths:
            paths[node_id] = [node_id]
            
    return list(drones), base_station, links, paths


class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@router.get("/survivors")
async def get_survivors():
    """Get current survivor data (REST endpoint)"""
    return [survivor.to_dict() for survivor in survivors]


@router.get("/survivors/{survivor_id}")
async def get_survivor(survivor_id: str):
    """Get specific survivor data"""
    survivor = next((s for s in survivors if s.id == survivor_id), None)
    if survivor:
        return survivor.to_dict()
    return JSONResponse(status_code=404, content={"error": "Survivor not found"})


@router.post("/survivors/{survivor_id}/panic")
async def trigger_panic(survivor_id: str):
    """Trigger panic button for a survivor"""
    survivor = next((s for s in survivors if s.id == survivor_id), None)
    if survivor:
        survivor.panic_button_pressed = True
        survivor._update_status()
        return {"status": "panic_triggered", "survivor_id": survivor_id}
    return JSONResponse(status_code=404, content={"error": "Survivor not found"})


@router.websocket("/ws/survivors")
async def survivor_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time survivor data updates"""
    await manager.connect(websocket)
    
    try:
        # Calculate initial mesh network
        init_drones, init_base, init_links, init_paths = calculate_mesh()
        # Send initial data
        initial_data = {
            "type": "initial",
            "survivors": [survivor.to_dict() for survivor in survivors],
            "drones": init_drones,
            "base_station": init_base,
            "mesh_links": init_links,
            "paths": init_paths
        }
        await websocket.send_json(initial_data)
        
        # Stream updates every 2 seconds
        while True:
            await asyncio.sleep(2)
            if websocket not in manager.active_connections:
                break
            
            # Update all survivors
            updated_survivors = []
            for survivor in survivors:
                updated_data = survivor.update_vitals()
                updated_survivors.append(updated_data)
            
            # Calculate updated mesh network topology
            curr_drones, curr_base, curr_links, curr_paths = calculate_mesh()
            
            # Send update
            update_message = {
                "type": "update",
                "timestamp": datetime.now().isoformat(),
                "survivors": updated_survivors,
                "drones": curr_drones,
                "base_station": curr_base,
                "mesh_links": curr_links,
                "paths": curr_paths
            }
            
            await websocket.send_json(update_message)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
        print(f"WebSocket error: {e}")


@router.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    print("Wearables router initialized with survivor tracking")
