import datetime
from flask import Blueprint, jsonify, request
from gridshare.backend.app.models import (
    db,
    Household,
    EnergyReading,
    Battery,
    EnergyTransaction,
    OptimizationDecision,
    Prediction,
    MarketOffer,
    MarketRequest,
)
from gridshare.backend.app.services.community_state_service import CommunityStateService
from gridshare.backend.app.services.prediction_service import PredictionService
from gridshare.backend.app.services.rule_optimizer import RuleBasedOptimizer
from gridshare.database.seed_data import seed_database

demo_bp = Blueprint("demo", __name__)

@demo_bp.route("/api/demo/run-scenario", methods=["POST"])
def run_demo_scenario():
    """
    Executes the deterministic 'SUNNY AFTERNOON COMMUNITY' Demo Scenario.
    House A: Gen 6.8 kW, Con 2.1 kW (Surplus 4.7 kW)
    House B: Gen 1.2 kW, Con 4.0 kW (Deficit 2.8 kW)
    Battery: 40% SOC
    Grid Tariff: ₹6.10/kWh
    Expected:
      1. Local Trade: 2.80 kW (House A -> House B)
      2. Battery Buffer: 1.20 kW (House A -> Battery)
      3. Grid Export: 0.70 kW (House A -> Utility Grid)
    """
    timeline = []

    # Step 1: Set Battery to 40%
    battery = db.session.query(Battery).filter_by(community_id="green_enclave_cluster").first()
    if not battery:
        battery = Battery(
            community_id="green_enclave_cluster",
            capacity_kwh=50.0,
            current_soc=40.0,
            min_reserve=20.0,
            updated_at=datetime.datetime.utcnow(),
        )
        db.session.add(battery)
    else:
        battery.current_soc = 40.0
        battery.min_reserve = 20.0
        battery.updated_at = datetime.datetime.utcnow()
    db.session.commit()

    # Step 2: Inject Deterministic Telemetry
    now = datetime.datetime.utcnow()
    readings = [
        EnergyReading(
            household_id="house_a",
            timestamp=now,
            generation_kw=6.80,
            consumption_kw=2.10,
            battery_soc=85.0,
            grid_price=6.10,
            source="SIMULATED",
        ),
        EnergyReading(
            household_id="house_b",
            timestamp=now,
            generation_kw=1.20,
            consumption_kw=4.00,
            battery_soc=None,
            grid_price=6.10,
            source="SIMULATED",
        ),
        EnergyReading(
            household_id="house_c",
            timestamp=now,
            generation_kw=3.50,
            consumption_kw=2.20,
            battery_soc=50.0,
            grid_price=6.10,
            source="SIMULATED",
        ),
        EnergyReading(
            household_id="house_d",
            timestamp=now,
            generation_kw=0.00,
            consumption_kw=2.50,
            battery_soc=None,
            grid_price=6.10,
            source="SIMULATED",
        ),
        EnergyReading(
            household_id="house_e",
            timestamp=now,
            generation_kw=5.20,
            consumption_kw=1.80,
            battery_soc=70.0,
            grid_price=6.10,
            source="SIMULATED",
        ),
    ]
    db.session.add_all(readings)
    db.session.commit()

    timeline.append({
        "step": 1,
        "title": "Ingested Telemetry",
        "description": "House A (Gen: 6.8kW, Con: 2.1kW -> Surplus: +4.7kW), House B (Gen: 1.2kW, Con: 4.0kW -> Deficit: -2.8kW), Central Battery (40% SOC).",
        "timestamp": now.isoformat(),
    })

    # Step 3: Observe Community State
    state = CommunityStateService.observe_community_state()
    summary = state["summary"]
    timeline.append({
        "step": 2,
        "title": "Observed Microgrid State",
        "description": f"Classified net balances: Total Community Generation = {summary['total_generation_kw']} kW, Demand = {summary['total_consumption_kw']} kW, Net Balance = {summary['net_community_balance_kw']} kW.",
        "data": summary,
    })

    # Step 4: Run ML Prediction
    pred_res = PredictionService.run_prediction_pipeline()
    timeline.append({
        "step": 3,
        "title": "Executed ML Demand Forecast",
        "description": "RandomForestRegressor predicted short-term household loads and empirical ensemble tree uncertainties.",
        "forecasts_count": pred_res["predictions_count"],
    })

    # Step 5: Run Deterministic Optimizer on House A vs House B
    optimizer_result = RuleBasedOptimizer.allocate_energy(
        surplus_kw=4.70,
        deficit_kw=2.80,
        battery_soc=40.0,
        battery_capacity_kwh=50.0,
        battery_min_reserve=20.0,
        max_charge_rate_kw=1.20,
        grid_price=6.10,
    )
    alloc = optimizer_result["summary_allocation"]

    # Persist the 3 optimization decisions
    d1 = OptimizationDecision(
        timestamp=now,
        source_household="house_a",
        target="house_b",
        energy_kwh=2.80,
        action="LOCAL_TRADE",
        reason="[Demo] Priority 1: Serving local consumer deficit (House B) directly with House A solar surplus at ₹4.50/kWh.",
    )
    d2 = OptimizationDecision(
        timestamp=now,
        source_household="house_a",
        target="community_battery",
        energy_kwh=1.20,
        action="STORE",
        reason="[Demo] Priority 2: Buffering community battery storage tank (current SOC: 40%) with remaining solar surplus.",
    )
    d3 = OptimizationDecision(
        timestamp=now,
        source_household="house_a",
        target="utility_grid",
        energy_kwh=0.70,
        action="GRID_EXPORT",
        reason="[Demo] Priority 3: Exporting residual unallocated surplus to the utility grid via feed-in tariff.",
    )
    db.session.add_all([d1, d2, d3])

    # Persist the simulated transaction
    tx = EnergyTransaction(
        seller_household_id="house_a",
        buyer_household_id="house_b",
        energy_kwh=2.80,
        price_per_kwh=4.50,
        total_value=12.60,
        status="COMPLETED",
        timestamp=now,
    )
    db.session.add(tx)
    db.session.commit()

    timeline.append({
        "step": 4,
        "title": "Deterministic Rule Optimizer Executed",
        "description": f"Allocated 4.70 kW surplus: 2.80 kW -> Local Trade (House B), 1.20 kW -> Central Battery, 0.70 kW -> Grid Export.",
        "allocation": alloc,
    })

    timeline.append({
        "step": 5,
        "title": "Bilateral Energy Transaction Settled",
        "description": f"#TX-{tx.id}: House A -> House B | 2.80 kWh @ ₹4.50/kWh = ₹12.60 settled and logged to audit ledger.",
        "transaction_id": tx.id,
    })

    return jsonify({
        "status": "SUCCESS",
        "scenario": "SUNNY_AFTERNOON_COMMUNITY",
        "scenario_name": "Sunny Afternoon Community (Demo Mode)",
        "source": "SIMULATED",
        "scenario_parameters": {
            "house_a": {"generation_kw": 6.80, "consumption_kw": 2.10, "surplus_kw": 4.70},
            "house_b": {"generation_kw": 1.20, "consumption_kw": 4.00, "deficit_kw": 2.80},
            "battery_soc": 40.0,
            "grid_price": 6.10,
            "p2p_price": 4.50,
        },
        "allocation_results": {
            "local_trade_kw": alloc["local_trade_kw"],
            "battery_allocation_kw": alloc["battery_allocation_kw"],
            "grid_export_kw": alloc["grid_export_kw"],
            "total_allocated_kw": 4.70,
        },
        "timeline": timeline,
    }), 200

@demo_bp.route("/api/demo/reset", methods=["POST"])
def reset_demo():
    """Resets the microgrid database to initial clean deterministic seed data."""
    seed_database(clear_existing=True)
    return jsonify({
        "status": "SUCCESS",
        "message": "Microgrid database reset to clean baseline seed data.",
        "source": "SIMULATED",
    }), 200
