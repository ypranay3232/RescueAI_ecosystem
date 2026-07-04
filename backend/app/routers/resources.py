import copy
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/resources", tags=["Resources"])

INITIAL_RESOURCES = {
    "teams": [
        {"id": "T1", "name": "Rescue Team Alpha", "status": "deployed", "location": "Sector B", "members": 6},
        {"id": "T2", "name": "Rescue Team Bravo", "status": "standby", "location": "Base Camp", "members": 4},
    ],
    "ambulances": [
        {"id": "A1", "name": "Ambulance Alpha", "status": "en_route", "eta_min": 12, "location": "Highway 14"},
        {"id": "A2", "name": "Ambulance Beta", "status": "available", "eta_min": 0, "location": "Hospital Staging"},
    ],
    "drones": [
        {"id": "D1", "name": "Drone 1", "status": "grounded", "battery_pct": 92, "reason": "High wind warning"},
        {"id": "D2", "name": "Drone 2", "status": "active", "battery_pct": 67, "location": "Sector C"},
        {"id": "D3", "name": "Drone 3", "status": "available", "battery_pct": 100, "location": "Base Camp"},
    ],
    "supplies": [
        {"item": "Medical kits", "qty": 24, "status": "adequate"},
        {"item": "Water (L)", "qty": 480, "status": "adequate"},
        {"item": "Life vests", "qty": 8, "status": "low"},
    ],
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

# Stateful mutable in-memory database copy
resources_state = copy.deepcopy(INITIAL_RESOURCES)


class DispatchRequest(BaseModel):
    resource_id: str
    resource_type: str  # "teams", "ambulances", or "drones"
    status: str
    location: str
    eta_min: Optional[int] = None


@router.get("")
async def list_resources():
    """List all available rescue assets and their current status"""
    return resources_state


@router.post("/dispatch")
async def dispatch_resource(req: DispatchRequest):
    """Simulate deploying an asset to a survivor or sector location"""
    global resources_state
    resource_list = resources_state.get(req.resource_type)
    if not resource_list:
        return {"error": f"Invalid resource type: {req.resource_type}"}

    updated = False
    for item in resource_list:
        if item.get("id") == req.resource_id:
            item["status"] = req.status
            item["location"] = req.location
            if "eta_min" in item and req.eta_min is not None:
                item["eta_min"] = req.eta_min
            elif req.eta_min is not None:
                item["eta_min"] = req.eta_min
            updated = True
            break

    if not updated:
        return {"error": f"Resource {req.resource_id} not found in {req.resource_type}"}

    resources_state["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"status": "success", "resources": resources_state}


@router.post("/reset")
async def reset_resources():
    """Reset simulation resources to base status"""
    global resources_state
    resources_state = copy.deepcopy(INITIAL_RESOURCES)
    resources_state["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"status": "success", "resources": resources_state}


@router.get("/triage")
async def get_triage_list():
    """Calculate and return survivor triage priorities sorted by Injury Severity Index (ISI)"""
    from app.routers.wearables import survivors
    triage_results = []
    
    for s in survivors:
        score = 0
        # Heart rate contributions
        if s.heart_rate > 140 or s.heart_rate < 50:
            score += 30
        elif s.heart_rate > 120 or s.heart_rate < 60:
            score += 12
            
        # Oxygen saturation contributions (SpO2 is highly critical)
        if s.oxygen_saturation < 90:
            score += 40
        elif s.oxygen_saturation < 95:
            score += 18
            
        # Temperature contributions
        if s.temperature > 39.0 or s.temperature < 35.5:
            score += 20
        elif s.temperature > 37.8 or s.temperature < 36.0:
            score += 8
            
        # Stress & Panic contributions
        if s.panic_button_pressed:
            score += 25
        if s.stress_level > 80:
            score += 10
            
        isi = min(100, score)
        
        # Color categorisation
        if isi >= 55:
            color = "red"
            label = "Immediate"
        elif isi >= 25:
            color = "yellow"
            label = "Delayed"
        else:
            color = "green"
            label = "Minor"
            
        triage_results.append({
            "id": s.id,
            "name": s.name,
            "lat": s.lat,
            "lng": s.lng,
            "isi": isi,
            "category": color,
            "label": label,
            "vitals": {
                "heart_rate": s.heart_rate,
                "oxygen_saturation": s.oxygen_saturation,
                "temperature": s.temperature,
                "panic": s.panic_button_pressed
            }
        })
        
    # Sort survivors by ISI descending
    triage_results.sort(key=lambda x: x["isi"], reverse=True)
    return triage_results


