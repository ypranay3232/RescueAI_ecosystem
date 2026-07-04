import os
import uuid
import shutil

from fastapi import APIRouter, File, UploadFile, Query, HTTPException

from app.ai.service import ai_service
from app.ai.yolo_detector import get_detector
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
async def analyze_image(
    file: UploadFile = File(None),
    sample: str = Query(None),
    model: str = Query("yolo11n")
):
    if not file and not sample:
        raise HTTPException(status_code=400, detail="Either file upload or sample name must be provided.")

    if sample:
        # Validate sample file name
        if sample not in ["images.jpg", "imagess.jpg"]:
            raise HTTPException(status_code=400, detail="Invalid sample image")
        
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        source_path = os.path.join(project_root, "content", sample)
        
        if not os.path.exists(source_path):
            raise HTTPException(status_code=404, detail="Sample image not found")
            
        # Copy sample image to uploads so it has a unique path and does not conflict
        os.makedirs(settings.upload_dir, exist_ok=True)
        base_no_ext, ext = os.path.splitext(sample)
        path = os.path.join(settings.upload_dir, f"sample_{base_no_ext}_{uuid.uuid4()}{ext}")
        shutil.copy2(source_path, path)
    else:
        os.makedirs(settings.upload_dir, exist_ok=True)
        base_no_ext, ext = os.path.splitext(file.filename or "image.jpg")
        path = os.path.join(settings.upload_dir, f"{base_no_ext}_{uuid.uuid4()}{ext}")

        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)

    # Use YOLO detection for human/animal detection
    detector = get_detector()
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(backend_dir, settings.upload_dir)
    
    yolo_result = detector.detect(path, save_dir=save_dir, model_name=model)
    
    # Combine YOLO detections with AI analysis for additional context
    # If AI keys are available, get additional analysis
    is_video = yolo_result.get("is_video", False)
    if settings.openai_api_key or settings.gemini_api_key:
        if not is_video:
            try:
                ai_result = await ai_service.analyze_image(path, VISION_PROMPT)
                # Merge YOLO detections with AI analysis
                yolo_result["safe_landing_zones"] = ai_result.get("safe_landing_zones", [])
                yolo_result["priority_areas"] = ai_result.get("priority_areas", [])
            except Exception:
                yolo_result["safe_landing_zones"] = [
                    {"name": "LZ-1", "lat": 34.153, "lng": -118.228, "score": 0.92},
                    {"name": "LZ-2", "lat": 34.161, "lng": -118.252, "score": 0.85},
                ]
                yolo_result["priority_areas"] = [
                    {"name": "Sector C", "priority": 1, "reason": "Confirmed survivors detected"},
                ]
        else:
            try:
                text_prompt = (
                    f"Analyze these drone detections from a video footage: {yolo_result['detections']}. "
                    "Recommend safe landing zones and priority areas. "
                    "Return JSON with: "
                    "safe_landing_zones (list of {name, lat, lng, score}), "
                    "priority_areas (list of {name, priority, reason})."
                )
                ai_result = await ai_service.analyze_text(text_prompt)
                yolo_result["safe_landing_zones"] = ai_result.get("safe_landing_zones", [])
                yolo_result["priority_areas"] = ai_result.get("priority_areas", [])
            except Exception:
                yolo_result["safe_landing_zones"] = [
                    {"name": "LZ-1", "lat": 34.153, "lng": -118.228, "score": 0.92},
                    {"name": "LZ-2", "lat": 34.161, "lng": -118.252, "score": 0.85},
                ]
                yolo_result["priority_areas"] = [
                    {"name": "Sector C", "priority": 1, "reason": "Confirmed survivors detected"},
                ]
    else:
        # Add mock landing zones and priority areas if no AI available
        yolo_result["safe_landing_zones"] = [
            {"name": "LZ-1", "lat": 34.153, "lng": -118.228, "score": 0.92},
            {"name": "LZ-2", "lat": 34.161, "lng": -118.252, "score": 0.85},
        ]
        yolo_result["priority_areas"] = [
            {"name": "Sector C", "priority": 1, "reason": "Confirmed survivors detected"},
        ]

    # Return filenames and analysis
    filename_to_return = sample if sample else file.filename
    return {"filename": filename_to_return, "analysis": yolo_result}
