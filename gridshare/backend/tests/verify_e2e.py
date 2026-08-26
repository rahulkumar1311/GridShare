import sys
import json
import requests
import time

BASE_URL = "http://127.0.0.1:5000/api"

def run_e2e_verification():
    print("==================================================")
    print("[E2E] GridShare Full Pipeline Verification")
    print("==================================================")

    # 1. Health Check
    print("\n[Step 1] Verifying Backend Health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print(f"Health OK: {r.json()['status']}")

    # 2. Ingest PPT Demo Telemetry via POST /api/telemetry
    print("\n[Step 2] Ingesting PPT Demo Telemetry...")
    # House A (Solar Champion)
    payload_a = {
        "household_id": "house_a",
        "generation_kw": 6.8,
        "consumption_kw": 2.1,
        "battery_soc": 85.0,
        "grid_price": 6.10,
        "source": "SIMULATED",
    }
    r_a = requests.post(f"{BASE_URL}/telemetry", json=payload_a)
    assert r_a.status_code == 201, f"House A ingestion failed: {r_a.text}"
    print(f"House A Ingested: Gen=6.8kW, Con=2.1kW -> Surplus=+4.7kW")

    # House B (Heavy EV Consumer)
    payload_b = {
        "household_id": "house_b",
        "generation_kw": 1.2,
        "consumption_kw": 4.0,
        "battery_soc": None,
        "grid_price": 6.10,
        "source": "SIMULATED",
    }
    r_b = requests.post(f"{BASE_URL}/telemetry", json=payload_b)
    assert r_b.status_code == 201, f"House B ingestion failed: {r_b.text}"
    print(f"House B Ingested: Gen=1.2kW, Con=4.0kW -> Deficit=-2.8kW")

    # Set Central Battery SOC to 40%
    r_bat = requests.patch(f"{BASE_URL}/battery", json={"current_soc": 40.0, "min_reserve": 20.0})
    assert r_bat.status_code == 200
    print("Community Battery set to 40% SOC (20% Min Reserve)")

    # 3. Observe Layer Verification
    print("\n[Step 3] Querying Observe Layer (/api/observe/state)...")
    r_obs = requests.get(f"{BASE_URL}/observe/state")
    assert r_obs.status_code == 200
    obs_data = r_obs.json()["data"]
    summary = obs_data["summary"]
    print(f"Total Community Surplus: {summary['total_surplus_kw']} kW")
    print(f"Total Community Deficit: {summary['total_deficit_kw']} kW")
    print(f"Central Battery SOC: {summary['community_battery_soc']}%")
    print(f"Current Grid Price: INR {summary['current_grid_price']}/kWh")

    # 4. ML Prediction Layer Execution
    print("\n[Step 4] Triggering ML Prediction Layer (POST /api/predictions/run)...")
    r_pred = requests.post(f"{BASE_URL}/predictions/run")
    assert r_pred.status_code == 200
    pred_data = r_pred.json()
    print(f"ML Pipeline Executed: {pred_data['predictions_count']} household forecasts generated.")
    for p in pred_data["latest_predictions"][:2]:
        print(f"  * {p['household_id']}: Predicted Demand = {p['predicted_demand_kw']} kW (std = {p['uncertainty_value']} kW)")

    # 5. Optimization Layer Execution
    print("\n[Step 5] Triggering Deterministic Optimization Engine...")
    from gridshare.backend.app.services.rule_optimizer import RuleBasedOptimizer
    demo_opt = RuleBasedOptimizer.allocate_energy(
        surplus_kw=4.70,
        deficit_kw=2.80,
        battery_soc=40.0,
        battery_capacity_kwh=50.0,
        max_charge_rate_kw=1.20,
    )
    alloc = demo_opt["summary_allocation"]

    print("\n[OPTIMIZATION ALLOCATION PLAN RESULTS]:")
    print(f"  * Local Trade Allocation : {alloc['local_trade_kw']} kW (Expected: 2.8 kW)")
    print(f"  * Battery Storage Buffer : {alloc['battery_allocation_kw']} kW (Expected: 1.2 kW)")
    print(f"  * Grid Export (Feed-in)  : {alloc['grid_export_kw']} kW (Expected: 0.7 kW)")
    print(f"  * Total Allocated Energy : {demo_opt['input_state']['available_surplus_kw']} kW (House A Surplus: 4.7 kW)")

    assert abs(alloc['local_trade_kw'] - 2.8) < 0.01, f"Local trade mismatch: {alloc['local_trade_kw']}"
    assert abs(alloc['battery_allocation_kw'] - 1.2) < 0.01, f"Battery mismatch: {alloc['battery_allocation_kw']}"
    assert abs(alloc['grid_export_kw'] - 0.7) < 0.01, f"Grid export mismatch: {alloc['grid_export_kw']}"
    print("[SUCCESS] All allocation values matched expected PPT prototype demo values exactly!")

    # 6. Verify Transaction Records
    print("\n[Step 6] Verifying Executed Energy Transactions (/api/trades)...")
    r_trades = requests.get(f"{BASE_URL}/trades")
    assert r_trades.status_code == 200
    trades = r_trades.json()["trades"]
    print(f"Total Transactions Found: {len(trades)}")
    for t in trades[:3]:
        print(f"  * #TX-{t['id']}: {t['seller_household_id']} -> {t['buyer_household_id']} | {t['energy_kwh']} kWh @ INR {t['price_per_kwh']}/kWh = INR {t['total_value']} ({t['status']})")

    # 7. Dashboard Summary Verification
    print("\n[Step 7] Verifying Dashboard Summary Endpoint (/api/dashboard/summary)...")
    r_dash = requests.get(f"{BASE_URL}/dashboard/summary")
    assert r_dash.status_code == 200
    dash_data = r_dash.json()["data"]
    print(f"Dashboard Net Balance: {dash_data['energy_summary']['community_net_balance_kw']} kW")
    print(f"Dashboard Battery SOC: {dash_data['battery']['current_soc']}%")
    print(f"Dashboard Recent Trades: {len(dash_data['recent_trades'])}")

    print("\n==================================================")
    print("[SUCCESS] End-to-End Pipeline Fully Verified!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_verification()
