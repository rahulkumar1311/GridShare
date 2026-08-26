"""
Energy Telemetry Generator.
Generates realistic simulated energy readings across community households.
Notice: All records are strictly synthetic and tagged with source='SIMULATED'.
"""

import math
import random
from datetime import datetime, timezone

HOUSEHOLD_PROFILES = {
    "house_a": {
        "name": "House A (Solar Champion - 8kW)",
        "type": "PROSUMER",
        "solar_capacity_kw": 8.0,
        "base_load_kw": 1.5,
        "peak_load_kw": 2.5,
        "has_battery": True,
        "base_battery_soc": 75.0,
    },
    "house_b": {
        "name": "House B (Heavy Consumer / EV)",
        "type": "CONSUMER",
        "solar_capacity_kw": 1.5,
        "base_load_kw": 3.0,
        "peak_load_kw": 5.5,
        "has_battery": False,
        "base_battery_soc": None,
    },
    "house_c": {
        "name": "House C (Balanced Prosumer - 4kW)",
        "type": "PROSUMER",
        "solar_capacity_kw": 4.0,
        "base_load_kw": 1.2,
        "peak_load_kw": 2.8,
        "has_battery": True,
        "base_battery_soc": 60.0,
    },
    "house_d": {
        "name": "House D (Smart Apartment)",
        "type": "CONSUMER",
        "solar_capacity_kw": 0.0,
        "base_load_kw": 1.0,
        "peak_load_kw": 3.2,
        "has_battery": False,
        "base_battery_soc": None,
    },
    "house_e": {
        "name": "House E (Solar Villa - 6kW)",
        "type": "PROSUMER",
        "solar_capacity_kw": 6.0,
        "base_load_kw": 1.8,
        "peak_load_kw": 3.0,
        "has_battery": True,
        "base_battery_soc": 80.0,
    },
}

class TelemetryGenerator:
    def __init__(self, base_price=6.10):
        self.base_price = base_price

    def generate_ppt_scenario(self):
        """
        Deterministic Presentation Scenario (Fixed Illustrative Values).
        - House A: Gen=6.8kW, Con=2.1kW, Surplus=+4.7kW
        - House B: Gen=1.2kW, Con=4.0kW, Deficit=-2.8kW
        - Community Battery: SOC=40%
        - Grid Price: ₹6.10/kWh
        """
        now = datetime.now(timezone.utc).isoformat()
        return [
            {
                "household_id": "house_a",
                "household_name": HOUSEHOLD_PROFILES["house_a"]["name"],
                "household_type": "PROSUMER",
                "timestamp": now,
                "generation_kw": 6.80,
                "consumption_kw": 2.10,
                "net_balance_kw": 4.70,
                "battery_soc": 85.0,
                "grid_price": self.base_price,
                "source": "SIMULATED",
            },
            {
                "household_id": "house_b",
                "household_name": HOUSEHOLD_PROFILES["house_b"]["name"],
                "household_type": "CONSUMER",
                "timestamp": now,
                "generation_kw": 1.20,
                "consumption_kw": 4.00,
                "net_balance_kw": -2.80,
                "battery_soc": None,
                "grid_price": self.base_price,
                "source": "SIMULATED",
            },
            {
                "household_id": "house_c",
                "household_name": HOUSEHOLD_PROFILES["house_c"]["name"],
                "household_type": "PROSUMER",
                "timestamp": now,
                "generation_kw": 3.50,
                "consumption_kw": 2.20,
                "net_balance_kw": 1.30,
                "battery_soc": 65.0,
                "grid_price": self.base_price,
                "source": "SIMULATED",
            },
            {
                "household_id": "house_d",
                "household_name": HOUSEHOLD_PROFILES["house_d"]["name"],
                "household_type": "CONSUMER",
                "timestamp": now,
                "generation_kw": 0.00,
                "consumption_kw": 1.80,
                "net_balance_kw": -1.80,
                "battery_soc": None,
                "grid_price": self.base_price,
                "source": "SIMULATED",
            },
            {
                "household_id": "house_e",
                "household_name": HOUSEHOLD_PROFILES["house_e"]["name"],
                "household_type": "PROSUMER",
                "timestamp": now,
                "generation_kw": 5.20,
                "consumption_kw": 2.00,
                "net_balance_kw": 3.20,
                "battery_soc": 90.0,
                "grid_price": self.base_price,
                "source": "SIMULATED",
            },
        ]

    def generate_live_reading(self, household_id, timestamp=None, add_noise=True):
        """Generate realistic reading with diurnal time curve."""
        prof = HOUSEHOLD_PROFILES.get(household_id, HOUSEHOLD_PROFILES["house_a"])
        ts = timestamp or datetime.now(timezone.utc)
        hour = ts.hour + ts.minute / 60.0

        # Solar bell curve peaking at 13:00 (6 AM - 6 PM)
        if 6.0 <= hour <= 18.0:
            solar_intensity = math.sin(math.pi * (hour - 6.0) / 12.0)
            solar_intensity = max(0.0, solar_intensity)
        else:
            solar_intensity = 0.0

        noise_gen = random.uniform(-0.15, 0.15) if add_noise else 0.0
        generation = max(0.0, round(prof["solar_capacity_kw"] * solar_intensity + noise_gen, 3))

        # Demand pattern: Morning rise (7-10 AM) + Evening cooking/lighting/AC rise (6-10 PM)
        if 7.0 <= hour <= 10.0:
            demand_weight = 0.85
        elif 18.0 <= hour <= 22.0:
            demand_weight = 1.0
        elif 0.0 <= hour <= 5.0:
            demand_weight = 0.35
        else:
            demand_weight = 0.60

        noise_con = random.uniform(-0.1, 0.1) if add_noise else 0.0
        consumption = max(0.2, round(prof["base_load_kw"] + (prof["peak_load_kw"] - prof["base_load_kw"]) * demand_weight + noise_con, 3))

        # Battery State of Charge (if installed)
        soc = None
        if prof["has_battery"]:
            net = generation - consumption
            soc = min(100.0, max(20.0, round(prof["base_battery_soc"] + net * 2.5, 1)))

        return {
            "household_id": household_id,
            "household_name": prof["name"],
            "household_type": prof["type"],
            "timestamp": ts.isoformat(),
            "generation_kw": generation,
            "consumption_kw": consumption,
            "net_balance_kw": round(generation - consumption, 3),
            "battery_soc": soc,
            "grid_price": self.base_price,
            "source": "SIMULATED",
        }
