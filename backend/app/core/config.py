from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "AeriSeg SIEM+SOAR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str = "CHANGE_ME_minimum_32_characters_here_x"
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 480

    DB_URL: str = "postgresql+asyncpg://aeriseg_user:aeriseg_password@127.0.0.1:5433/aeriseg_db"
    
    ELASTICSEARCH_URL: str = "http://127.0.0.1:9200"
    ELASTICSEARCH_USER: str = "elastic"
    ELASTICSEARCH_PASSWORD: str = "changeme"

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
