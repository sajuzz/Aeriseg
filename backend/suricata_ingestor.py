#!/usr/bin/env python3
"""
AeriSeg Suricata Ingestor
=========================
Tails /var/log/suricata/eve.json (or any path via --log-file),
transforms each event into the AeriSeg common schema, and ships
it to the telemetry ingest API.

Usage:
    python suricata_ingestor.py
    python suricata_ingestor.py --log-file /var/log/suricata/eve.json --api http://localhost:8000

Requirements:
    pip install requests
"""

import argparse
import json
import os
import sys
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("suricata_ingestor")

# ── Severity mapping from Suricata priority to AeriSeg ───────────────────────
PRIORITY_MAP = {
    1: "CRITICAL",
    2: "HIGH",
    3: "MEDIUM",
    4: "LOW",
}

def map_severity(event: dict) -> str:
    """Derive AeriSeg severity from Suricata alert metadata."""
    priority = event.get("alert", {}).get("severity", 3)
    return PRIORITY_MAP.get(priority, "MEDIUM")


def transform(raw: dict) -> dict | None:
    """
    Ships the raw Suricata EVE record to the backend.
    The backend Parser Registry will handle normalization.
    """
    event_type = raw.get("event_type", "unknown")
    
    return {
        "source": "suricata",
        "event_type": event_type,
        "raw_log": raw
    }


def ship(api_base: str, payload: dict, session: requests.Session) -> bool:
    """POST a single transformed event to AeriSeg ingest API."""
    try:
        r = session.post(
            f"{api_base}/api/v1/ingest/events",
            json=payload,
            timeout=5,
        )
        if r.status_code == 200:
            return True
        log.warning("Ingest API returned %s: %s", r.status_code, r.text[:200])
        return False
    except requests.exceptions.ConnectionError:
        log.error("Cannot reach AeriSeg API at %s — is the backend running?", api_base)
        return False
    except Exception as exc:
        log.error("Ship error: %s", exc)
        return False


def tail_and_ingest(log_file: str, api_base: str, poll_interval: float = 1.0):
    """
    Tail eve.json from the current end-of-file, processing new lines as
    Suricata appends them. Reconnects on file rotation.
    """
    path = Path(log_file)
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    log.info("AeriSeg Suricata Ingestor starting")
    log.info("  Log file : %s", log_file)
    log.info("  API base : %s", api_base)
    log.info("  Poll     : %.1fs", poll_interval)

    # Wait for file to appear
    while not path.exists():
        log.info("Waiting for eve.json at %s ...", log_file)
        time.sleep(5)

    inode     = os.stat(log_file).st_ino
    shipped   = 0
    skipped   = 0
    errors    = 0

    with open(log_file, "r", encoding="utf-8", errors="replace") as f:
        # Seek to end so we only process *new* events
        f.seek(0, 2)
        log.info("Tailing from current EOF — waiting for new Suricata events...")

        while True:
            line = f.readline()
            if not line:
                # Check for file rotation
                try:
                    if os.stat(log_file).st_ino != inode:
                        log.info("eve.json rotated — reopening")
                        f.close()
                        f = open(log_file, "r", encoding="utf-8", errors="replace")
                        inode = os.stat(log_file).st_ino
                except FileNotFoundError:
                    pass
                time.sleep(poll_interval)
                continue

            line = line.strip()
            if not line:
                continue

            try:
                raw = json.loads(line)
            except json.JSONDecodeError as exc:
                log.debug("JSON parse error (line skipped): %s", exc)
                errors += 1
                continue

            payload = transform(raw)
            if payload is None:
                skipped += 1
                continue

            ok = ship(api_base, payload, session)
            if ok:
                shipped += 1
                sig = payload["raw_log"].get("signature", payload["event_type"])
                src = payload["raw_log"].get("src_ip", "?")
                log.info("[+] Shipped event #%d | %s | src=%s", shipped, sig, src)
            else:
                errors += 1
                # Back-off briefly on errors
                time.sleep(2)

            # Periodic summary log
            if (shipped + errors) % 100 == 0 and (shipped + errors) > 0:
                log.info("Stats — shipped: %d  skipped: %d  errors: %d", shipped, skipped, errors)


def main():
    parser = argparse.ArgumentParser(
        description="AeriSeg Suricata eve.json ingestor"
    )
    parser.add_argument(
        "--log-file",
        default="/var/log/suricata/eve.json",
        help="Path to Suricata eve.json (default: /var/log/suricata/eve.json)"
    )
    parser.add_argument(
        "--api",
        default="http://localhost:8000",
        help="AeriSeg backend base URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--poll",
        type=float,
        default=1.0,
        help="Poll interval in seconds when no new data (default: 1.0)"
    )
    args = parser.parse_args()

    try:
        tail_and_ingest(args.log_file, args.api, args.poll)
    except KeyboardInterrupt:
        log.info("Ingestor stopped by user.")


if __name__ == "__main__":
    main()
