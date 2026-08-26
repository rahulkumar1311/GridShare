"""
Telemetry Publisher.
Transmits simulated smart meter data packets to the GridShare backend
via HTTP REST API or MQTT.
"""

import json
import requests
from .config import SimulatorConfig

class TelemetryPublisher:
    def __init__(self, api_url=SimulatorConfig.API_URL, mqtt_enabled=SimulatorConfig.MQTT_ENABLED):
        self.api_url = api_url
        self.mqtt_enabled = mqtt_enabled
        self.mqtt_client = None

        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self.mqtt_client = mqtt.Client()
                self.mqtt_client.connect(SimulatorConfig.MQTT_HOST, SimulatorConfig.MQTT_PORT, 60)
            except Exception as e:
                print(f"[Simulator Warning] MQTT connection failed: {e}. Falling back to HTTP.")
                self.mqtt_enabled = False

    def publish_http(self, payload):
        """Send telemetry packet to Flask Backend HTTP endpoint."""
        try:
            res = requests.post(self.api_url, json=payload, timeout=5)
            return res.status_code in (200, 201), res.json() if res.status_code in (200, 201) else res.text
        except requests.exceptions.RequestException as e:
            return False, str(e)

    def publish_mqtt(self, payload):
        """Publish telemetry to MQTT topic."""
        if self.mqtt_client and self.mqtt_enabled:
            try:
                self.mqtt_client.publish(SimulatorConfig.MQTT_TOPIC, json.dumps(payload))
                return True, "Published via MQTT"
            except Exception as e:
                return False, str(e)
        return False, "MQTT not enabled"

    def publish(self, payload):
        """Publish via HTTP and optionally MQTT."""
        results = {}
        http_ok, http_msg = self.publish_http(payload)
        results["http"] = {"success": http_ok, "response": http_msg}

        if self.mqtt_enabled:
            mqtt_ok, mqtt_msg = self.publish_mqtt(payload)
            results["mqtt"] = {"success": mqtt_ok, "response": mqtt_msg}

        return results
