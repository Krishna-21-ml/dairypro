from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    # No APP_NAME here — it caused "Extra inputs not permitted" error
    DEBUG: bool = False
    SECRET_KEY: str = "your-super-secret-key-minimum-32-characters-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "dairy_management"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:19006"]

    class Config:
        env_file = ".env"
        extra = "ignore"   # ← KEY FIX: ignore unknown fields like APP_NAME

settings = Settings()
