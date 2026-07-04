from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Tuple, Dict, Any
import math

router = APIRouter()

# Simulated disaster zones (hazards)
# Each hazard has a type, center, radius (in degrees), and label
hazards = [
    {
        "id": "H1",
        "type": "flood",
        "name": "Flooded Sector (River Overflow)",
        "center": [34.156, -118.248],
        "radius": 0.0045, # degrees
        "color": "#3b82f6"
    },
    {
        "id": "H2",
        "type": "fire",
        "name": "Active Brush Fire Zone",
        "center": [34.150, -118.260],
        "radius": 0.0055, # degrees
        "color": "#ef4444"
    }
]

class RouteRequest(BaseModel):
    start: Tuple[float, float]
    end: Tuple[float, float]

def is_point_in_circle(lat: float, lng: float, center: List[float], radius: float) -> bool:
    dist = math.sqrt((lat - center[0])**2 + (lng - center[1])**2)
    return dist <= radius

def find_intersection_point(start: Tuple[float, float], end: Tuple[float, float], center: List[float], radius: float) -> Tuple[float, float]:
    # Simple binary search approximation to find where route hits the circle boundary
    low, high = 0.0, 1.0
    for _ in range(15):
        mid = (low + high) / 2
        lat = start[0] + mid * (end[0] - start[0])
        lng = start[1] + mid * (end[1] - start[1])
        if is_point_in_circle(lat, lng, center, radius):
            high = mid
        else:
            low = mid
    t = (low + high) / 2
    return (start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1]))

@router.get("/obstacles")
async def get_obstacles():
    """Get active hazard/disaster zones"""
    return hazards

@router.post("/route/plan")
async def plan_route(req: RouteRequest):
    """Calculate standard vs hazard-avoiding routing with drone transition if blocked"""
    start, end = req.start, req.end
    
    # 1. Check if the straight-line path intersects any hazards
    intersected_hazard = None
    for h in hazards:
        # Check midpoints along the route to see if we cross the hazard circle
        steps = 20
        for i in range(steps + 1):
            t = i / steps
            lat = start[0] + t * (end[0] - start[0])
            lng = start[1] + t * (end[1] - start[1])
            if is_point_in_circle(lat, lng, h["center"], h["radius"]):
                intersected_hazard = h
                break
        if intersected_hazard:
            break
            
    standard_route = [start, end]
    
    if not intersected_hazard:
        # Clear path
        return {
            "hazard_detected": False,
            "drone_required": False,
            "standard_route": standard_route,
            "optimized_route": standard_route,
            "ground_route": standard_route,
            "drone_route": []
        }
        
    # Hazard detected! Check if destination lies INSIDE the hazard
    dest_blocked = is_point_in_circle(end[0], end[1], intersected_hazard["center"], intersected_hazard["radius"])
    
    if dest_blocked:
        # Scenario A: Destination is inside danger zone. Ground teams can only go to the edge.
        # Drone must carry supplies the rest of the way.
        boundary_point = find_intersection_point(start, end, intersected_hazard["center"], intersected_hazard["radius"])
        
        # Add a tiny offset so the staging area is outside the danger zone
        dx = start[0] - end[0]
        dy = start[1] - end[1]
        length = math.sqrt(dx**2 + dy**2) or 1
        offset_lat = (dx / length) * 0.0005
        offset_lng = (dy / length) * 0.0005
        staging_point = (boundary_point[0] + offset_lat, boundary_point[1] + offset_lng)
        
        ground_route = [start, staging_point]
        drone_route = [staging_point, end]
        
        return {
            "hazard_detected": True,
            "hazard_name": intersected_hazard["name"],
            "drone_required": True,
            "standard_route": standard_route,
            "optimized_route": ground_route, # Ground stops at boundary
            "ground_route": ground_route,
            "drone_route": drone_route,
            "drone_start_point": staging_point
        }
    else:
        # Scenario B: Route intersects hazard, but end is outside. ground teams can detour.
        # Find a detour point: push the midpoint of the route away from the circle center
        midpoint = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
        hc = intersected_hazard["center"]
        
        # Calculate direction vector from hazard center to midpoint
        vx = midpoint[0] - hc[0]
        vy = midpoint[1] - hc[1]
        length = math.sqrt(vx**2 + vy**2) or 1
        
        # Detour point lies outside the circle boundary
        detour_dist = intersected_hazard["radius"] + 0.002
        detour_point = (
            hc[0] + (vx / length) * detour_dist,
            hc[1] + (vy / length) * detour_dist
        )
        
        optimized_route = [start, detour_point, end]
        
        return {
            "hazard_detected": True,
            "hazard_name": intersected_hazard["name"],
            "drone_required": False,
            "standard_route": standard_route,
            "optimized_route": optimized_route,
            "ground_route": optimized_route,
            "drone_route": []
        }
