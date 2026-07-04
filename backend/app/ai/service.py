from typing import Any

from app.config import settings


class AIService:
    """Generic AI service — swap prompts per hackathon module."""

    async def analyze_text(self, prompt: str, context: str = "") -> dict[str, Any]:
        full_prompt = f"{prompt}\n\nContext:\n{context}" if context else prompt
        return await self._complete(full_prompt, json_mode=True)

    async def analyze_image(self, image_path: str, prompt: str) -> dict[str, Any]:
        # Simulated detections when no API key; real vision when configured
        if not settings.openai_api_key and not settings.gemini_api_key:
            return self._mock_vision_analysis()
        return await self._vision(image_path, prompt)

    async def summarize(self, text: str) -> str:
        result = await self._complete(f"Summarize concisely:\n{text}", json_mode=False)
        return result if isinstance(result, str) else str(result)

    async def generate_recommendation(self, scenario: dict[str, Any]) -> dict[str, Any]:
        prompt = (
            "You are an emergency response AI planner. "
            "Given the operational scenario, recommend prioritized actions. "
            "Return JSON with keys: summary, actions (list of {priority, action, eta_minutes, resource}), "
            "risk_level (low|medium|high|critical)."
        )
        return await self.analyze_text(prompt, str(scenario))

    async def classify_risk(self, data: dict[str, Any]) -> dict[str, Any]:
        prompt = (
            "Classify emergency risk. Return JSON with: level (green|yellow|red), "
            "score (0-100), factors (list of strings), recommendation (string)."
        )
        return await self.analyze_text(prompt, str(data))

    async def predict_search_zone(self, aircraft: dict[str, Any]) -> dict[str, Any]:
        prompt = (
            "Predict aircraft crash search zone from last known data. "
            "Return JSON with: center_lat, center_lng, radius_km, confidence (0-1), "
            "priority_regions (list of {name, lat, lng, priority 1-5, confidence}), "
            "reasoning (string)."
        )
        return await self.analyze_text(prompt, str(aircraft))

    async def _complete(self, prompt: str, json_mode: bool = True) -> Any:
        if settings.ai_provider == "gemini" and settings.gemini_api_key:
            return await self._gemini_complete(prompt, json_mode)
        if settings.openai_api_key:
            return await self._openai_complete(prompt, json_mode)
        return self._mock_text_response(prompt, json_mode)

    async def _openai_complete(self, prompt: str, json_mode: bool) -> Any:
        import json

        import httpx

        body: dict[str, Any] = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json=body,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content) if json_mode else content

    async def _gemini_complete(self, prompt: str, json_mode: bool) -> Any:
        import json

        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        full = f"{prompt}\n\nRespond with valid JSON only." if json_mode else prompt
        response = model.generate_content(full)
        text = response.text.strip()
        if json_mode:
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        return text

    async def _vision(self, image_path: str, prompt: str) -> dict[str, Any]:
        import base64

        import httpx

        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                                },
                            ],
                        }
                    ],
                },
            )
            resp.raise_for_status()
            import json

            return json.loads(resp.json()["choices"][0]["message"]["content"])

    def _mock_text_response(self, prompt: str, json_mode: bool) -> Any:
        if not json_mode:
            return "Mock AI summary — configure OPENAI_API_KEY or GEMINI_API_KEY for live responses."

        if "search zone" in prompt.lower() or "crash" in prompt.lower():
            return {
                "center_lat": 34.152,
                "center_lng": -118.243,
                "radius_km": 12.5,
                "confidence": 0.78,
                "priority_regions": [
                    {"name": "Sector A", "lat": 34.158, "lng": -118.231, "priority": 5, "confidence": 0.91},
                    {"name": "Sector B", "lat": 34.145, "lng": -118.255, "priority": 4, "confidence": 0.82},
                    {"name": "Sector C", "lat": 34.162, "lng": -118.248, "priority": 3, "confidence": 0.71},
                ],
                "reasoning": "Wind drift and descent rate suggest southeast drift from last contact point.",
            }

        if "recommend" in prompt.lower() or "planner" in prompt.lower():
            return {
                "summary": "Deploy aerial assets to Sector C; ground teams stage at LZ-2.",
                "actions": [
                    {
                        "priority": 1,
                        "action": "Deploy Drone 2 to Sector C — 2 possible survivors detected",
                        "eta_minutes": 4,
                        "resource": "Drone 2",
                    },
                    {
                        "priority": 2,
                        "action": "Route Ambulance Alpha to LZ-2 staging area",
                        "eta_minutes": 12,
                        "resource": "Ambulance Alpha",
                    },
                    {
                        "priority": 3,
                        "action": "Delay Drone 1 launch — high winds in 18 min",
                        "eta_minutes": 0,
                        "resource": "Drone 1",
                    },
                ],
                "risk_level": "high",
            }

        return {
            "level": "yellow",
            "score": 62,
            "factors": ["Elevated heart rate", "Low movement", "Storm approaching"],
            "recommendation": "Dispatch wellness check team within 15 minutes.",
        }

    def _mock_vision_analysis(self) -> dict[str, Any]:
        return {
            "detections": [
                {"type": "person", "count": 2, "confidence": 0.89, "lat": 34.159, "lng": -118.237},
                {"type": "fire", "count": 1, "confidence": 0.76, "lat": 34.151, "lng": -118.249},
                {"type": "flooded_road", "count": 1, "confidence": 0.84, "lat": 34.148, "lng": -118.261},
                {"type": "damaged_building", "count": 3, "confidence": 0.71, "lat": 34.155, "lng": -118.244},
            ],
            "victim_estimate": 2,
            "safe_landing_zones": [
                {"name": "LZ-1", "lat": 34.153, "lng": -118.228, "score": 0.92},
                {"name": "LZ-2", "lat": 34.161, "lng": -118.252, "score": 0.85},
            ],
            "priority_areas": [
                {"name": "Sector C", "priority": 1, "reason": "Confirmed survivors + fire proximity"},
                {"name": "North Ridge", "priority": 2, "reason": "Blocked access road"},
            ],
        }


ai_service = AIService()
