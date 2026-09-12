import pytest
from app.core.config import settings

def test_config_loaded():
    assert settings.APP_NAME == "AeriSeg SIEM+SOAR"
    assert "postgresql" in settings.DB_URL
    assert settings.ELASTICSEARCH_URL == "http://127.0.0.1:9200"
