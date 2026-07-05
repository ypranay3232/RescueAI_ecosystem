from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    gemini_api_key: str = ""
    xai_api_key: str = ""
    ai_provider: str = "openai"
    openweather_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
