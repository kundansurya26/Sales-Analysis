"""
Application configuration loaded from environment variables.
All secrets must be set via .env or environment — never hardcoded.
"""
import secrets
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"

    # ── Database ──────────────────────────────────────────────────────────────
    # SQLite by default; swap for PostgreSQL in production:
    # DATABASE_URL = "postgresql+asyncpg://user:pass@host/dbname"
    DATABASE_URL: str = "sqlite+aiosqlite:///./sales_dashboard.db"

    # ── JWT Auth ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Redis (optional caching) ──────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300  # 5 minutes

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── Demo Credentials ──────────────────────────────────────────────────────
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "Admin123!"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
