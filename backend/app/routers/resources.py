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

