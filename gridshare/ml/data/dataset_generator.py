"""
Synthetic Historical Energy Telemetry Dataset Generator for ML Training.
Generates multi-week diurnal microgrid time-series data with realistic
morning/evening demand spikes, solar generation curves, and weather variability.
"""

import math
from datetime import datetime, timedelta, timezone
import pandas as pd
import numpy as np

HOUSEHOLD_METRICS = {
    "house_a": {"name": "House A", "solar_kw": 8.0, "base_load_kw": 1.5, "peak_load_kw": 2.5},
    "house_b": {"name": "House B", "solar_kw": 1.5, "base_load_kw": 3.0, "peak_load_kw": 5.5},
    "house_c": {"name": "House C", "solar_kw": 4.0, "base_load_kw": 1.2, "peak_load_kw": 2.8},
    "house_d": {"name": "House D", "solar_kw": 0.0, "base_load_kw": 1.0, "peak_load_kw": 3.2},
    "house_e": {"name": "House E", "solar_kw": 6.0, "base_load_kw": 1.8, "peak_load_kw": 3.0},
}

def generate_telemetry_dataset(days=60, grid_price=6.10, seed=42) -> pd.DataFrame:
    """
    Generate synthetic historical energy readings for 5 households.
    All data tagged with source = 'SIMULATED'.
    """
    np.random.seed(seed)
    start_time = datetime.now(timezone.utc) - timedelta(days=days)
    records = []

    total_hours = days * 24
    for hour_idx in range(total_hours):
        current_time = start_time + timedelta(hours=hour_idx)
        hour = current_time.hour
        day_of_week = current_time.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0

        # Solar bell curve peaking at 13:00
        if 6 <= hour <= 18:
            solar_intensity = max(0.0, math.sin(math.pi * (hour - 6) / 12.0))
            # Cloud noise
            cloud_factor = np.random.uniform(0.75, 1.0)
        else:
            solar_intensity = 0.0
            cloud_factor = 0.0

        # Demand pattern (Morning 7-10am + Evening 6-10pm peak)
        if 7 <= hour <= 10:
            demand_weight = 0.85
        elif 18 <= hour <= 22:
            demand_weight = 1.0
        elif 1 <= hour <= 5:
            demand_weight = 0.35
        else:
            demand_weight = 0.60

        # Weekend demand slightly higher midday
        if is_weekend and 11 <= hour <= 16:
            demand_weight += 0.25

        for h_id, prof in HOUSEHOLD_METRICS.items():
            noise_gen = np.random.normal(0, 0.08)
            generation = max(0.0, round(prof["solar_kw"] * solar_intensity * cloud_factor + noise_gen, 3))

            noise_con = np.random.normal(0, 0.12)
            consumption = max(0.2, round(
                prof["base_load_kw"] + (prof["peak_load_kw"] - prof["base_load_kw"]) * demand_weight + noise_con, 3
            ))

            records.append({
                "timestamp": current_time.isoformat(),
                "household_id": h_id,
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "generation_kw": generation,
                "consumption_kw": consumption,
                "grid_price": grid_price,
                "source": "SIMULATED",
            })

    df = pd.DataFrame(records)
    return df
