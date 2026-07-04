from typing import Any

import httpx

from app.config import settings


async def get_weather(lat: float, lng: float) -> dict[str, Any]:
    if not settings.openweather_api_key:
        return _mock_weather(lat, lng)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": lat,
                "lon": lng,
                "appid": settings.openweather_api_key,
                "units": "metric",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "temp_c": data["main"]["temp"],
            "wind_speed_ms": data["wind"]["speed"],
            "wind_deg": data["wind"].get("deg", 0),
            "conditions": data["weather"][0]["description"],
            "humidity": data["main"]["humidity"],
            "flood_risk": "medium" if data["main"]["humidity"] > 80 else "low",
            "flight_safe": data["wind"]["speed"] < 15,
            "recommendation": _weather_recommendation(data["wind"]["speed"]),
        }


def _mock_weather(lat: float, lng: float) -> dict[str, Any]:
    return {
        "temp_c": 18.5,
        "wind_speed_ms": 12.4,
        "wind_deg": 225,
        "conditions": "partly cloudy",
        "humidity": 72,
        "flood_risk": "medium",
        "flight_safe": False,
        "recommendation": "Delay drone launches in 18 min — gusts expected up to 22 m/s.",
        "lat": lat,
        "lng": lng,
        "forecast": [
            {"hour": "+1h", "rain_mm": 2.1, "wind_ms": 14},
            {"hour": "+2h", "rain_mm": 8.4, "wind_ms": 22},
            {"hour": "+3h", "rain_mm": 12.0, "wind_ms": 18},
        ],
    }


def _weather_recommendation(wind_speed: float) -> str:
    if wind_speed >= 15:
        return "High wind — reroute drones or delay flights."
    if wind_speed >= 10:
        return "Moderate wind — monitor conditions closely."
    return "Conditions favorable for drone operations."
