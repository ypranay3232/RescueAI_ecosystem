from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai, resources, vision, weather

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

app.include_router(ai.router, prefix="/api")
app.include_router(vision.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(resources.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_configured": bool(settings.openai_api_key or settings.gemini_api_key)}
