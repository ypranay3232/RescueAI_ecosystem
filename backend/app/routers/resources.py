from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/resources", tags=["Resources"])

MOCK_RESOURCES = {
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


@router.get("")
async def list_resources():
    return MOCK_RESOURCES
