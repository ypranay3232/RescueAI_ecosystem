from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.service import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])


class TextAnalysisRequest(BaseModel):
    prompt: str
    context: str = ""


class ScenarioRequest(BaseModel):
    scenario: dict = Field(default_factory=dict)


class AircraftSearchRequest(BaseModel):
    last_lat: float
    last_lng: float
    speed_knots: float
    heading_deg: float
    altitude_ft: float
    minutes_since_contact: float
    weather: str = "clear"


@router.post("/analyze-text")
async def analyze_text(req: TextAnalysisRequest):
    return await ai_service.analyze_text(req.prompt, req.context)


class ChatRequest(BaseModel):
    prompt: str
    context: str = ""


@router.post("/chat")
async def chat(req: ChatRequest):
    reply = await ai_service.chat(req.prompt, req.context)
    return {"reply": reply}


@router.post("/recommend")
async def recommend(req: ScenarioRequest):
    return await ai_service.generate_recommendation(req.scenario)


@router.post("/classify-risk")
async def classify_risk(req: ScenarioRequest):
    return await ai_service.classify_risk(req.scenario)


@router.post("/search-zone")
async def search_zone(req: AircraftSearchRequest):
    data = req.model_dump()
    return await ai_service.predict_search_zone(data)


class EvacuationPlanRequest(BaseModel):
    disaster_type: str
    latitude: float
    longitude: float
    severity: str
    impact_radius_km: float
    resources: list = Field(default_factory=list)


@router.post("/evacuation-plan")
async def evacuation_plan(req: EvacuationPlanRequest):
    return await ai_service.generate_evacuation_plan(req.model_dump())


class CrashResponsePlanRequest(BaseModel):
    aircraft_type: str
    people_onboard: int
    last_known_lat: float
    last_known_lng: float
    terrain: str
    weather: str = "clear"
    wearable_survivors: list = Field(default_factory=list)


@router.post("/crash-response-plan")
async def crash_response_plan(req: CrashResponsePlanRequest):
    return await ai_service.generate_crash_response_plan(req.model_dump())


