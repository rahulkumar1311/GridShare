from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.telemetry_service import TelemetryService
from gridshare.backend.app.schemas.validators import validate_telemetry_payload

telemetry_bp = Blueprint("telemetry", __name__)

@telemetry_bp.route("/api/telemetry", methods=["POST"])
def post_telemetry():
    """Ingest live energy telemetry packet from Simulator or ESP32 hardware."""
    data = request.get_json(silent=True)
    is_valid, err = validate_telemetry_payload(data)
    if not is_valid:
        return jsonify({"status": "ERROR", "message": err}), 400

    reading = TelemetryService.ingest_reading(data)
    return jsonify({
        "status": "SUCCESS",
        "message": "Telemetry reading ingested successfully",
        "reading": reading,
    }), 201
