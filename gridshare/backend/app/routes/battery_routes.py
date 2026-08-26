from flask import Blueprint, jsonify, request
from gridshare.backend.app.models import db
from gridshare.backend.app.services.battery_accounting_service import BatteryAccountingService
from gridshare.backend.app.services.storage_optimization_service import StorageOptimizationService

battery_bp = Blueprint("battery", __name__)

@battery_bp.route("/api/battery", methods=["GET", "PATCH"])
def get_battery():
    """Returns or updates complete community battery state, capacity, SOC, and credits."""
    if request.method == "PATCH":
        data = request.get_json() or {}
        battery = BatteryAccountingService.get_or_create_battery()
        if "current_soc" in data:
            battery.current_soc = float(data["current_soc"])
            battery.current_energy_kwh = round((battery.current_soc / 100.0) * (battery.capacity_kwh or 50.0), 3)
        if "min_reserve" in data:
            battery.min_reserve = float(data["min_reserve"])
        if "capacity_kwh" in data:
            battery.capacity_kwh = float(data["capacity_kwh"])
        db.session.commit()

    state = BatteryAccountingService.get_battery_state()
    return jsonify({
        "status": "SUCCESS",
        "battery": state,
        "source": "SIMULATED",
    }), 200

@battery_bp.route("/api/battery/ownership", methods=["GET"])
def get_battery_ownership():
    """Returns household-level ownership credits and percentage shares."""
    summary = BatteryAccountingService.get_ownership_summary()
    return jsonify({
        "status": "SUCCESS",
        "data": summary,
        "source": "SIMULATED",
    }), 200

@battery_bp.route("/api/battery/contribute", methods=["POST"])
def contribute_energy():
    """
    Injects surplus prosumer energy into community battery:
    Payload: { "household_id": "house_a", "energy_kwh": 10.0 }
    """
    data = request.get_json() or {}
    household_id = data.get("household_id")
    energy_kwh = data.get("energy_kwh")

    if not household_id or energy_kwh is None:
        return jsonify({"status": "ERROR", "message": "Missing 'household_id' or 'energy_kwh' in request body."}), 400

    try:
        energy_val = float(energy_kwh)
        result = BatteryAccountingService.contribute_energy(
            household_id=household_id,
            energy_kwh=energy_val,
            reason=data.get("reason"),
        )
        return jsonify(result), 201
    except ValueError as ve:
        return jsonify({"status": "ERROR", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "ERROR", "message": f"Server error: {str(e)}"}), 500

@battery_bp.route("/api/battery/withdraw", methods=["POST"])
def withdraw_energy():
    """
    Withdraws energy from community battery under configured fairness policy:
    Payload: { "energy_kwh": 5.0, "policy": "PROPORTIONAL_OWNERSHIP" }
    """
    data = request.get_json() or {}
    energy_kwh = data.get("energy_kwh")
    policy = data.get("policy", "PROPORTIONAL_OWNERSHIP")

    if energy_kwh is None:
        return jsonify({"status": "ERROR", "message": "Missing 'energy_kwh' in request body."}), 400

    try:
        energy_val = float(energy_kwh)
        result = BatteryAccountingService.withdraw_energy(
            energy_kwh=energy_val,
            policy=policy,
            reason=data.get("reason"),
        )
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({"status": "ERROR", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "ERROR", "message": f"Server error: {str(e)}"}), 500

@battery_bp.route("/api/battery/ledger", methods=["GET"])
def get_battery_ledger():
    """Returns complete immutable ledger audit trail for community storage."""
    limit = int(request.args.get("limit", 100))
    entries = BatteryAccountingService.get_ledger(limit=limit)
    return jsonify({
        "status": "SUCCESS",
        "count": len(entries),
        "ledger": entries,
        "source": "SIMULATED",
    }), 200

@battery_bp.route("/api/optimization/storage-decision", methods=["POST"])
def evaluate_storage_decision():
    """
    Evaluates Store vs. Grid Export decision for available surplus:
    Payload: { "surplus_kwh": 4.70, "predicted_demand_kw": 4.2 }
    """
    data = request.get_json() or {}
    surplus_kwh = float(data.get("surplus_kwh", 4.70))
    current_grid_price = float(data.get("current_grid_price", 3.50))
    predicted_demand = float(data.get("predicted_demand_kw", 4.2))

    res = StorageOptimizationService.evaluate_storage_vs_export(
        surplus_kwh=surplus_kwh,
        current_grid_price=current_grid_price,
        predicted_evening_demand_kw=predicted_demand,
    )
    return jsonify(res), 200

@battery_bp.route("/api/demo/battery-fairness-demo", methods=["POST"])
def run_battery_fairness_demo():
    """
    Deterministic Hackathon Demo Scenario:
    1. Reset battery state.
    2. House A contributes 10.0 kWh (Usable: 9.0 kWh).
    3. House B contributes 1.0 kWh (Usable: 0.9 kWh).
    4. Total Contributed = 11.0 kWh (Total Usable = 9.9 kWh).
    5. Proportional withdrawal of 5.0 kWh:
       - House A allocated: 5 * (10/11) = 4.5455 kWh (Remaining: 4.4545 kWh)
       - House B allocated: 5 * (1/11) = 0.4545 kWh (Remaining: 0.4455 kWh)
    6. Store vs. Export decision evaluation on 4.7 kWh surplus.
    """
    from gridshare.database.seed_data import seed_database
    from gridshare.backend.app.models import db, Battery, BatteryContribution, BatteryWithdrawal, BatteryLedger

    # Reset battery records cleanly
    db.session.query(BatteryLedger).delete()
    db.session.query(BatteryWithdrawal).delete()
    db.session.query(BatteryContribution).delete()
    db.session.commit()

    battery = BatteryAccountingService.get_or_create_battery()
    battery.capacity_kwh = 20.0
    battery.current_energy_kwh = 0.0
    battery.round_trip_efficiency = 0.90
    battery.min_reserve = 0.0
    battery.minimum_reserve_kwh = 0.0
    battery.sync_soc_from_energy()
    db.session.commit()

    # Step 1: House A contributes 10 kWh
    c1 = BatteryAccountingService.contribute_energy(
        household_id="house_a",
        energy_kwh=10.0,
        reason="[Demo] House A midday solar surplus injection (10 kWh @ 90% efficiency = 9.0 kWh usable)."
    )

    # Step 2: House B contributes 1 kWh
    c2 = BatteryAccountingService.contribute_energy(
        household_id="house_b",
        energy_kwh=1.0,
        reason="[Demo] House B small surplus injection (1 kWh @ 90% efficiency = 0.9 kWh usable)."
    )

    state_after_contributions = BatteryAccountingService.get_ownership_summary()

    # Step 3: Withdraw 5 kWh proportionally
    w_res = BatteryAccountingService.withdraw_energy(
        energy_kwh=5.0,
        policy="PROPORTIONAL_OWNERSHIP",
        reason="[Demo] Community evening peak demand withdrawal (5.0 kWh) under proportional ownership policy."
    )

    state_after_withdrawal = BatteryAccountingService.get_ownership_summary()

    # Step 4: Storage vs Export optimization evaluation
    opt_decision = StorageOptimizationService.evaluate_storage_vs_export(
        surplus_kwh=4.70,
        current_grid_price=3.50,
        predicted_evening_demand_kw=4.20,
    )

    return jsonify({
        "status": "SUCCESS",
        "scenario": "COMMUNITY_BATTERY_FAIRNESS_DEMO",
        "parameters": {
            "house_a_contribution_kwh": 10.0,
            "house_b_contribution_kwh": 1.0,
            "total_contributed_kwh": 11.0,
            "round_trip_efficiency": 0.90,
            "withdrawal_amount_kwh": 5.0,
        },
        "step_1_contributions": state_after_contributions,
        "step_2_withdrawal_allocation": w_res,
        "step_3_remaining_ownership": state_after_withdrawal,
        "step_4_storage_decision": opt_decision,
        "source": "SIMULATED",
    }), 200
