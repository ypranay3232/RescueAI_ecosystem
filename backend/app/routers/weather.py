from fastapi import APIRouter, Query

from app.apis.weather import get_weather

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("")
async def weather(lat: float = Query(34.152), lng: float = Query(-118.243)):
    return await get_weather(lat, lng)
