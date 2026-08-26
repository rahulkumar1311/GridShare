import os
from dotenv import load_dotenv

load_dotenv()

class SimulatorConfig:
    INTERVAL_SECONDS = float(os.getenv("SIMULATOR_INTERVAL_SECONDS", 3.0))
    API_URL = os.getenv("SIMULATOR_API_URL", "http://localhost:5000/api/telemetry")
    NUM_HOUSEHOLDS = int(os.getenv("SIMULATOR_NUM_HOUSEHOLDS", 5))
    BASE_GRID_PRICE = float(os.getenv("SIMULATOR_BASE_GRID_PRICE", 6.10))
    MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
    MQTT_TOPIC = os.getenv("MQTT_TOPIC_TELEMETRY", "gridshare/telemetry")
    MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() in ("true", "1", "yes")
