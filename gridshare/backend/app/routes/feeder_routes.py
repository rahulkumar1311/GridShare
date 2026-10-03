"""
Feeder Reliability & Microgrid Intermittency Route Blueprint.
Schneider Electric Yuva Yodha 2026 — Challenge 03.
"""

from flask import Blueprint, jsonify, request
from gridshare.backend.app.services.feeder_simulation_engine import FeederSimulationEngine, FeederConfig

feeder_bp = Blueprint("feeder", __name__)

# Singleton default engine instance
_engine = FeederSimulationEngine()

@feeder_bp.route("/api/feeder/status", methods=["GET"])
@feeder_bp.route("/api/feeder/reliability", methods=["GET"])
def get_feeder_reliability_status():
    """
    Returns live feeder-level electrical reliability metrics:
    transformer loading %, bus voltage deviation, intermittency state, and DER dispatch.
    """
    hour = float(request.args.get("hour", 12.0))
    weather = request.args.get("weather", "NORMAL")
    dt = float(request.args.get("duration_hours", 1.0))

    irr = 1.0
    if weather == "CLOUDY_INTERMITTENT":
        irr = 0.40
    elif weather == "HIGH_SOLAR":
        irr = 1.25

    step_res = _engine.simulate_step(
        step_index=0,
        hour_of_day=hour,
        duration_hours=dt,
        solar_irradiance_factor=irr,
        grid_available=True,
    )
    return jsonify({
        "status": "SUCCESS",
        "data": step_res,
        "source": "SIMULATED_PHYSICAL_FEEDER",
        "challenge": "Schneider Electric Challenge 03 - Grid Reliability & Renewable Intermittency",
    }), 200

@feeder_bp.route("/api/feeder/simulate", methods=["POST"])
