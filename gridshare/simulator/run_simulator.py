"""
GridShare Community Energy Telemetry Simulator.
Supports continuous live simulation, PPT demo scenario, and historical batch generation.
"""

import sys
import os
import time
import argparse
from datetime import datetime, timedelta, timezone

# Add workspace root and gridshare to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gridshare.simulator.config import SimulatorConfig
from gridshare.simulator.generator import TelemetryGenerator, HOUSEHOLD_PROFILES
from gridshare.simulator.publisher import TelemetryPublisher

def run_ppt_demo(publisher, generator):
    print("\n========================================================")
    print(" [GRIDSHARE PPT DEMO SCENARIO - DETERMINISTIC REPRODUCTION]")
    print("========================================================")
    print(" [Node 1] House A (Solar Champion): Gen=6.80 kW, Con=2.10 kW, Surplus=+4.70 kW")
    print(" [Node 2] House B (Heavy EV Home):  Gen=1.20 kW, Con=4.00 kW, Deficit=-2.80 kW")
    print(" [Community] Battery SOC = 40.0% (50.0 kWh)")
    print(" [Benchmark] Grid Tariff = Rs 6.10/kWh | P2P Tariff = Rs 4.50/kWh")
    print(" [Source Tag] All records marked as 'SIMULATED' (Illustrative only)")
    print("========================================================\n")

    packets = generator.generate_ppt_scenario()
    for pkt in packets:
        res = publisher.publish(pkt)
        status = "[OK]" if res["http"]["success"] else "[FAIL - Ensure backend is running]"
        print(f"{status} Sent telemetry for {pkt['household_id']}: Gen={pkt['generation_kw']}kW | Con={pkt['consumption_kw']}kW | Net={pkt['net_balance_kw']:+0.2f}kW")

    print("\nPPT Scenario published successfully. Triggering optimization engine...")
    try:
        import requests
        opt_res = requests.post("http://localhost:5000/api/optimization/run", timeout=5)
        if opt_res.status_code == 200:
            print("[SUCCESS] Optimization completed: P2P match executed!")
    except Exception as e:
        print(f"Note: Backend optimization endpoint reachable status: {e}")

def run_live_stream(publisher, generator, interval):
    print(f"\n[INFO] Starting continuous live telemetry stream (Interval: {interval}s)...")
    print("Press Ctrl+C to stop.\n")

    step = 0
    while True:
        step += 1
        now = datetime.now(timezone.utc)
        print(f"\n--- [Cycle #{step}] {now.strftime('%H:%M:%S UTC')} ---")
        for h_id in HOUSEHOLD_PROFILES.keys():
            pkt = generator.generate_live_reading(h_id, timestamp=now)
            res = publisher.publish(pkt)
            status = "[OK]" if res["http"]["success"] else "[HTTP ERR]"
            print(f" {status} {pkt['household_name'][:24]:<25}: Gen={pkt['generation_kw']:>5.2f}kW | Con={pkt['consumption_kw']:>5.2f}kW | Net={pkt['net_balance_kw']:>+5.2f}kW")
        time.sleep(interval)

def run_historical_batch(publisher, generator, hours=24):
    print(f"\n[INFO] Generating {hours} hours of historical diurnal telemetry...")
    now = datetime.now(timezone.utc)
    count = 0
    for h_offset in range(hours, 0, -1):
        ts = now - timedelta(hours=h_offset)
        for h_id in HOUSEHOLD_PROFILES.keys():
            pkt = generator.generate_live_reading(h_id, timestamp=ts, add_noise=True)
            publisher.publish_http(pkt)
            count += 1
    print(f"[SUCCESS] Ingested {count} historical readings successfully.")

def main():
    parser = argparse.ArgumentParser(description="GridShare Simulated Smart-Meter Telemetry Runner")
    parser.add_argument("--mode", choices=["live", "ppt", "history"], default="live", help="Simulation mode")
    parser.add_argument("--interval", type=float, default=SimulatorConfig.INTERVAL_SECONDS, help="Seconds between live readings")
    parser.add_argument("--hours", type=int, default=24, help="Hours of historical data to generate")
    args = parser.parse_args()

    generator = TelemetryGenerator(base_price=SimulatorConfig.BASE_GRID_PRICE)
    publisher = TelemetryPublisher()

    if args.mode == "ppt":
        run_ppt_demo(publisher, generator)
    elif args.mode == "history":
        run_historical_batch(publisher, generator, hours=args.hours)
    else:
        run_live_stream(publisher, generator, interval=args.interval)

if __name__ == "__main__":
    main()
