import json
import time
import os
from pathlib import Path
from threading import Thread

from app.parsers.registry import parser_registry
from app.repositories.telemetry_repository import telemetry_repo
from app.services.detection_service import detection_service

# On Windows, Suricata might be in C:\Program Files\Suricata\log\eve.json
# We'll allow override via environment variable
EVE_PATH = os.getenv("SURICATA_EVE_PATH", "C:\\Program Files\\Suricata\\log\\eve.json")

class SuricataRealtimeIngestor:
    def __init__(self):
        self.repo = telemetry_repo
        self.parser = parser_registry.get_parser("suricata")
        self.detection_service = detection_service

    def start(self):
        path = Path(EVE_PATH)

        if not path.exists():
            print(f"[ERROR] Suricata EVE log not found at {EVE_PATH}. Real-time ingestion disabled.")
            return

        print(f"[INFO] Starting Suricata real-time ingestion from {EVE_PATH}...")

        try:
            with open(EVE_PATH, "r") as f:
                # Seek to end of file to start tailing
                f.seek(0, 2)

                while True:
                    line = f.readline()

                    if not line:
                        time.sleep(0.5)
                        continue

                    try:
                        raw_event = json.loads(line)
                        normalized = self.parser.parse(raw_event)

                        if normalized:
                            # Use existing repo insert (which returns event_id)
                            # Convert pydantic model to dict for repo
                            event_id = self.repo.insert(normalized.dict())

                            # Trigger detection engine
                            self.detection_service.process_log(normalized.dict())

                            print(
                                f"[INGESTED] {normalized.event_type} | "
                                f"SEV: {normalized.severity} | "
                                f"ID: {event_id[:8]}"
                            )

                    except json.JSONDecodeError:
                        continue
                    except Exception as e:
                        print(f"[ERROR] Processing line: {e}")

        except Exception as e:
            print(f"[ERROR] Suricata Realtime Ingestor: {e}")

def start_suricata_ingestor():
    ingestor = SuricataRealtimeIngestor()
    thread = Thread(target=ingestor.start, daemon=True)
    thread.start()
    return thread
