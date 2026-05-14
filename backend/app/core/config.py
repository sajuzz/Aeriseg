from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "MediShield SIEM+XDR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str = "CHANGE_ME_minimum_32_characters_here_x"
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 480

    DB_URL: str = "postgresql+asyncpg://medishield:medishield123@127.0.0.1:5432/medishield"

    CH_HOST: str = "127.0.0.1"
    CH_PORT: int = 8123
    CH_USER: str = "default"
    CH_PASSWORD: str = ""
    CH_DB: str = "medishield"

    NATS_URL: str = "nats://127.0.0.1:4222"

    # SLA timeouts in seconds
    SLA_L1: int = 900      # 15 min
    SLA_L2: int = 3600     # 1 hr
    SLA_L3: int = 300      # 5 min (critical)

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    # Integrations
    SLACK_WEBHOOK_URL: str = ""
    CLOUDFLARE_API_KEY: str = ""
    CLOUDFLARE_EMAIL: str = ""
    CLOUDFLARE_ZONE_ID: str = ""


    class Config:
        env_file = ".env"



settings = Settings()
