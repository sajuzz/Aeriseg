import time
import threading
import structlog
import random
from app.db.database import get_db_connection
from app.api.simulator_router import trigger_attack
import asyncio

log = structlog.get_logger()

class DemoManager:
    def __init__(self):
        self.running = False
        self._thread = None

    def start(self):
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        log.info("demo_manager_started")

    def _is_demo_mode_active(self):
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT value FROM system_config WHERE key = 'DEMO_MODE'").fetchone()
            return row and row['value'].lower() == 'true'
        finally:
            conn.close()

    def _run_loop(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while self.running:
            try:
                if self._is_demo_mode_active():
                    # Pick a random attack to simulate
                    attack_type = random.choice(["sqli", "port_scan", "brute_force"])
                    log.info("demo_mode_triggering_attack", type=attack_type)
                    
                    # Call simulator logic
                    loop.run_until_complete(trigger_attack(attack_type))
                    
                    # Sleep for a while (30-90 seconds)
                    time.sleep(random.randint(30, 90))
                else:
                    time.sleep(10) # Check config again later
            except Exception as e:
                log.error("demo_manager_loop_error", error=str(e))
                time.sleep(30)
        
        loop.close()

demo_manager = DemoManager()
