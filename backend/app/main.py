import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import ai, resources, vision, weather, wearables, obstacles

app = FastAPI(
    title="RescueAI ecosystem API",
    description="Reusable emergency response backend — swap modules per hackathon",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve absolute paths and mount static directories
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
upload_path = os.path.join(backend_dir, settings.upload_dir)
content_path = os.path.join(os.path.dirname(backend_dir), "content")

os.makedirs(upload_path, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")
app.mount("/content", StaticFiles(directory=content_path), name="content")

app.include_router(ai.router, prefix="/api")
app.include_router(vision.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(wearables.router, prefix="/api")
app.include_router(obstacles.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_configured": bool(settings.openai_api_key or settings.gemini_api_key or settings.xai_api_key)}

