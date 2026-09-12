import structlog
from elasticsearch import AsyncElasticsearch
from app.core.config import settings

log = structlog.get_logger()

es_client: AsyncElasticsearch = None

async def init_es():
    global es_client
    es_client = AsyncElasticsearch(
        settings.ELASTICSEARCH_URL,
        basic_auth=(settings.ELASTICSEARCH_USER, settings.ELASTICSEARCH_PASSWORD),
        verify_certs=False
    )
    
    # Check connection
    try:
        info = await es_client.info()
        log.info("elasticsearch.connected", version=info['version']['number'])
        await _setup_index_templates()
    except Exception as e:
        log.error("elasticsearch.connection_failed", error=str(e))
        
async def close_es():
    global es_client
    if es_client:
        await es_client.close()

async def _setup_index_templates():
    template_name = "aeriseg-events-template"
    template_body = {
        "index_patterns": ["aeriseg-events-*"],
        "template": {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            },
            "mappings": {
                "dynamic_templates": [
                    {
                        "strings_as_keywords": {
                            "match_mapping_type": "string",
                            "mapping": {
                                "type": "keyword"
                            }
                        }
                    }
                ],
                "properties": {
                    "@timestamp": {"type": "date"},
                    "event": {
                        "properties": {
                            "category": {"type": "keyword"},
                            "type": {"type": "keyword"},
                            "action": {"type": "keyword"},
                            "outcome": {"type": "keyword"},
                            "severity": {"type": "keyword"}
                        }
                    },
                    "source": {
                        "properties": {
                            "ip": {"type": "ip"}
                        }
                    },
                    "destination": {
                        "properties": {
                            "ip": {"type": "ip"}
                        }
                    },
                    "tenant": {
                        "properties": {
                            "id": {"type": "keyword"}
                        }
                    },
                    "raw_event": {"type": "object", "enabled": False} 
                }
            }
        }
    }
    try:
        await es_client.indices.put_index_template(name=template_name, **template_body)
        log.info("elasticsearch.template_created", name=template_name)
    except Exception as e:
        log.error("elasticsearch.template_creation_failed", error=str(e))

def get_es_client() -> AsyncElasticsearch:
    return es_client
