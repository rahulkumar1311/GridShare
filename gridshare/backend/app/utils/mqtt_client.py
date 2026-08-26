import json
from .logger import logger

class MQTTTelemetryClient:
    """Optional MQTT client wrapper for low-frequency telemetry ingestion."""
    def __init__(self, host="localhost", port=1883, topic="gridshare/telemetry", enabled=False):
        self.host = host
        self.port = port
        self.topic = topic
        self.enabled = enabled
        self.client = None

    def start(self, on_message_callback=None):
        if not self.enabled:
            logger.info("MQTT client is disabled in configuration. Skipping broker connection.")
            return

        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client()

            def on_connect(client, userdata, flags, rc):
                if rc == 0:
                    logger.info(f"Connected to MQTT Broker {self.host}:{self.port}, subscribing to {self.topic}")
                    client.subscribe(self.topic)
                else:
                    logger.warning(f"Failed to connect to MQTT broker, return code: {rc}")

            def on_message(client, userdata, msg):
                try:
                    payload = json.loads(msg.payload.decode())
                    logger.info(f"MQTT Telemetry Received on [{msg.topic}]: {payload}")
                    if on_message_callback:
                        on_message_callback(payload)
                except Exception as e:
                    logger.error(f"Error parsing MQTT message payload: {e}")

            self.client.on_connect = on_connect
            self.client.on_message = on_message
            self.client.connect_async(self.host, self.port, 60)
            self.client.loop_start()
        except Exception as err:
            logger.warning(f"MQTT client initialization warning (non-fatal): {err}")

    def stop(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
