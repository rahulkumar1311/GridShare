from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.energy_service import EnergyService
from gridshare.backend.app.services.community_state_service import CommunityStateService

energy_bp = Blueprint("energy", __name__)

@energy_bp.route("/api/energy/live", methods=["GET"])
def get_live_energy():
    """Retrieve the latest energy readings for all community households."""
    data = EnergyService.get_live_readings()
    return jsonify({
        "status": "SUCCESS",
        "timestamp": data[0]["timestamp"] if data and data[0].get("timestamp") else None,
        "readings": data,
    }), 200

@energy_bp.route("/api/energy/observe", methods=["GET"])
@energy_bp.route("/api/observe/state", methods=["GET"])
def get_community_observed_state():
    """Observe Layer: Real-time comprehensive community state and net-energy classification."""
    state = CommunityStateService.observe_community_state()
    return jsonify({
        "status": "SUCCESS",
        "data": state,
    }), 200

@energy_bp.route("/api/energy/history", methods=["GET"])
def get_energy_history():
    """Retrieve historical time-series energy records."""
    household_id = request.args.get("household_id")
    hours = int(request.args.get("hours", 24))
    limit = int(request.args.get("limit", 200))
    history = EnergyService.get_history(household_id=household_id, limit=limit, hours=hours)
    return jsonify({
        "status": "SUCCESS",
        "count": len(history),
        "household_id": household_id,
        "history": history,
    }), 200

@energy_bp.route("/api/energy/summary", methods=["GET"])
def get_energy_summary():
    """Retrieve aggregated microgrid generation, consumption, and balance metrics."""
    summary = EnergyService.get_energy_summary()
    return jsonify({"status": "SUCCESS", "summary": summary}), 200
