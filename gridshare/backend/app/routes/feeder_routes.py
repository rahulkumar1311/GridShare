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
def simulate_feeder_horizon():
    """
    Executes multi-step feeder-level time series simulation:
    Payload:
      - horizon_steps: int (default 24)
      - step_duration_hours: float (default 1.0)
      - start_hour: float (default 0.0)
      - weather_scenario: str ("NORMAL" | "HIGH_SOLAR" | "CLOUDY_INTERMITTENT" | "MONSOON_STORM")
      - grid_available: bool (default True)
    """
    data = request.get_json(silent=True) or {}
    horizon = int(data.get("horizon_steps", 24))
    step_duration = float(data.get("step_duration_hours", 1.0))
    start_hour = float(data.get("start_hour", 0.0))
    weather = str(data.get("weather_scenario", "NORMAL"))
    grid_avail = bool(data.get("grid_available", True))

    # Initialize fresh engine for deterministic repeatable run
    sim_engine = FeederSimulationEngine()
    result = sim_engine.simulate_horizon(
        start_hour=start_hour,
        horizon_steps=horizon,
        step_duration_hours=step_duration,
        weather_scenario=weather,
        grid_available=grid_avail,
    )
    return jsonify(result), 200

@feeder_bp.route("/api/feeder/scenarios", methods=["GET"])
def get_feeder_scenarios():
    """Returns available test and hackathon demo scenarios."""
    scenarios = [
        {
            "id": "NORMAL",
            "name": "Standard Diurnal Day",
            "description": "Baseline solar bell curve with morning (8-10am) and evening peak (6-10pm) demand.",
        },
        {
            "id": "HIGH_SOLAR",
            "name": "High Renewable Surplus",
            "description": "Peak solar irradiance (1.25x). Tests transformer reverse power flow and ESS charge absorption.",
        },
        {
            "id": "CLOUDY_INTERMITTENT",
            "name": "Solar Intermittency & Cloud Transient",
            "description": "Midday cloud cover causes 65% solar drop. Demonstrates community ESS dispatch preventing voltage collapse.",
        },
        {
            "id": "MONSOON_STORM",
            "name": "Severe Renewable Deficit",
            "description": "Heavy cloud cover (0.2x solar). Tests peak utility import and flexible load shedding.",
        },
        {
            "id": "ISLANDED_BLACKOUT",
            "name": "Utility Grid Outage (Microgrid Islanding)",
            "description": "Main utility substation disconnects. Feeder operates purely on local solar, BTM storage, and Community ESS.",
        },
    ]
    return jsonify({"status": "SUCCESS", "scenarios": scenarios}), 200

@feeder_bp.route("/api/feeder/forecast", methods=["GET"])
def get_feeder_forecast():
    """Returns multi-household Random Forest demand forecasts and analytical solar predictions."""
    from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService
    try:
        horizon = int(request.args.get("horizon_hours", 6))
    except (ValueError, TypeError):
        horizon = 6
    horizon = max(1, min(24, horizon))

    forecasts = FeederForecastOptimizerService.get_feeder_forecasts(horizon_hours=horizon)
    serialized = {hid: {"household_name": val["config"].name, "steps": val["steps"]} for hid, val in forecasts.items()}
    return jsonify({"status": "SUCCESS", "horizon_hours": horizon, "forecasts": serialized}), 200

@feeder_bp.route("/api/feeder/optimize-forecast", methods=["POST"])
def optimize_feeder_forecast():
    """
    Executes multi-interval feeder optimization using Random Forest load & solar predictions.
    Detects shortfalls, schedules community ESS, coordinates P2P, shifts flexible load,
    and protects essential loads.
    """
    from gridshare.backend.app.services.feeder_optimizer_service import FeederForecastOptimizerService
    data = request.get_json(silent=True) or {}
    try:
        horizon = int(data.get("horizon_hours", 6))
    except (ValueError, TypeError):
        horizon = 6
    try:
        initial_soc = float(data.get("initial_battery_soc", 40.0))
    except (ValueError, TypeError):
        initial_soc = 40.0
    try:
