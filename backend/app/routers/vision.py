import os
import uuid

from fastapi import APIRouter, File, UploadFile

from app.ai.service import ai_service
from app.config import settings

router = APIRouter(prefix="/vision", tags=["Vision"])

VISION_PROMPT = (
    "Analyze this disaster/drone imagery. Return JSON with: "
    "detections (list of {type, count, confidence, lat, lng}), "
    "victim_estimate (int), "
    "safe_landing_zones (list of {name, lat, lng, score}), "
    "priority_areas (list of {name, priority, reason}). "
    "Detection types: person, fire, flooded_road, blocked_bridge, damaged_building, vehicle."
)


@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    path = os.path.join(settings.upload_dir, f"{uuid.uuid4()}{ext}")

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    result = await ai_service.analyze_image(path, VISION_PROMPT)
    return {"filename": file.filename, "analysis": result}
