import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "gridshare-secret-key-development")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///gridshare.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MQTT
    MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
    MQTT_TOPIC_TELEMETRY = os.getenv("MQTT_TOPIC_TELEMETRY", "gridshare/telemetry")
    MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() in ("true", "1", "yes")

    # Simulation & Grid Defaults
    BASE_GRID_PRICE = float(os.getenv("SIMULATOR_BASE_GRID_PRICE", 6.10))
    P2P_DISCOUNT_FACTOR = 0.75 # P2P tariff ≈ ₹4.50 when grid is ₹6.10
