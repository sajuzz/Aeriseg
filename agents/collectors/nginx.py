import threading
import time
import os

class NginxCollector:
    def __init__(self, log_path, callback):
        self.log_path = log_path
        self.callback = callback
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._tail_log)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        self.running = False

    def _tail_log(self):
        if not os.path.exists(self.log_path):
            with open(self.log_path, "w") as f:
                f.write("")
                
        with open(self.log_path, 'r') as f:
            f.seek(0, 2) # Seek to end
            while self.running:
                line = f.readline()
                if not line:
                    time.sleep(0.5)
                    continue
                self._process_line(line)

    def _process_line(self, line):
        parts = line.split()
        if len(parts) > 5:
            ip = parts[0]
            event = {
                "source": "nginx",
                "event_type": "http_request",
                "raw_log": {
                    "remote_addr": ip,
                    "raw": line.strip()
                }
            }
            self.callback(event)
