from .suricata import SuricataParser
from .base import PlaceholderParser

class ParserRegistry:
    def __init__(self):
        # Active and Planned parsers
        self._parsers = {
            "suricata": SuricataParser(),
            
            # Planned / Extensibility Demonstration
            "sysmon":  PlaceholderParser("sysmon"),
            "windows": PlaceholderParser("windows"),
            "hl7":     PlaceholderParser("hl7"),
            "modbus":  PlaceholderParser("modbus"),
            "mqtt":    PlaceholderParser("mqtt"),
            "opcua":   PlaceholderParser("opcua"),
        }
    
    def get_parser(self, source: str):
        """Returns the appropriate parser for the given telemetry source."""
        return self._parsers.get(source.lower(), self._parsers["suricata"])

    def get_all_sources(self):
        """Returns metadata about all supported/planned data sources."""
        return [
            {"id": "suricata", "name": "Suricata IDS", "status": "active",      "category": "Network"},
            {"id": "sysmon",   "name": "Windows Sysmon", "status": "planned",     "category": "Endpoint"},
            {"id": "hl7",      "name": "HL7 Medical",    "status": "planned",     "category": "Healthcare"},
            {"id": "modbus",   "name": "Modbus PLC",     "status": "planned",     "category": "OT/ICS"},
            {"id": "mqtt",     "name": "MQTT IoT",       "status": "planned",     "category": "IoT"},
            {"id": "windows",  "name": "Win Event Log",  "status": "planned",     "category": "Endpoint"},
        ]

parser_registry = ParserRegistry()
