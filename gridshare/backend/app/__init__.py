from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .models import db
from .utils.logger import logger
from .utils.mqtt_client import MQTTTelemetryClient
from .routes.health_routes import health_bp
from .routes.household_routes import household_bp
from .routes.energy_routes import energy_bp
from .routes.battery_routes import battery_bp
from .routes.prediction_routes import prediction_bp
from .routes.optimization_routes import optimization_bp
from .routes.trading_routes import trading_bp
from .routes.dashboard_routes import dashboard_bp
from .routes.telemetry_routes import telemetry_bp
from .routes.market_routes import market_bp
from .routes.demo_routes import demo_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    # Register Route Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(household_bp)
    app.register_blueprint(energy_bp)
    app.register_blueprint(battery_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(optimization_bp)
    app.register_blueprint(trading_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(telemetry_bp)
    app.register_blueprint(market_bp)
    app.register_blueprint(demo_bp)

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"status": "ERROR", "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({"status": "ERROR", "message": "Internal server error"}), 500

    # Optional MQTT Ingestion setup
    if app.config.get("MQTT_ENABLED"):
        from .services.telemetry_service import TelemetryService
        mqtt_client = MQTTTelemetryClient(
            host=app.config.get("MQTT_BROKER_HOST"),
            port=app.config.get("MQTT_BROKER_PORT"),
            topic=app.config.get("MQTT_TOPIC_TELEMETRY"),
            enabled=True,
        )
        def handle_mqtt_telemetry(payload):
            with app.app_context():
                TelemetryService.ingest_reading(payload)

        mqtt_client.start(on_message_callback=handle_mqtt_telemetry)

    return app
