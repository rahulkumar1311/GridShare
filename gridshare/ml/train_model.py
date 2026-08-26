"""
Train Random Forest Energy Forecaster on historical synthetic diurnal data.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from gridshare.ml.model import EnergyForecaster

def generate_training_data(days=30):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    records = []
    
    profiles = [
        {"id": "house_a", "solar": 8.0, "base": 1.5, "peak": 2.5},
        {"id": "house_b", "solar": 1.5, "base": 3.0, "peak": 5.5},
        {"id": "house_c", "solar": 4.0, "base": 1.2, "peak": 2.8},
        {"id": "house_d", "solar": 0.0, "base": 1.0, "peak": 3.2},
        {"id": "house_e", "solar": 6.0, "base": 1.8, "peak": 3.0},
    ]

    total_hours = days * 24
    for i in range(total_hours):
        ts = start + timedelta(hours=i)
        hour = ts.hour
        for p in profiles:
            # Solar curve
            if 6 <= hour <= 18:
                solar_factor = max(0.0, 1.0 - abs(hour - 13) / 6.0)
            else:
                solar_factor = 0.0
            gen = p["solar"] * solar_factor * np.random.uniform(0.85, 1.05)

            # Demand curve
            if 7 <= hour <= 10 or 18 <= hour <= 22:
                dem_factor = 1.0
            elif 1 <= hour <= 5:
                dem_factor = 0.35
            else:
                dem_factor = 0.65
            con = p["base"] + (p["peak"] - p["base"]) * dem_factor + np.random.uniform(-0.15, 0.15)

            records.append({
                "timestamp": ts.isoformat(),
                "household_id": p["id"],
                "solar_capacity_kw": p["solar"],
                "base_load_kw": p["base"],
                "generation_kw": max(0.0, gen),
                "consumption_kw": max(0.2, con),
            })

    return pd.DataFrame(records)

def train_and_export():
    print("🤖 Generating 30-day synthetic training dataset...")
    df = generate_training_data(days=30)
    print(f"Dataset generated: {len(df)} records.")

    # Train Demand Model
    demand_forecaster = EnergyForecaster(n_estimators=100)
    print("Training Random Forest Demand Forecaster...")
    metrics_con = demand_forecaster.train(df, df["consumption_kw"])
    print(f"Demand Model Performance: R2={metrics_con['r2']:.4f}, MAE={metrics_con['mae']:.4f} kW")

    # Save
    model_dir = os.path.dirname(__file__)
    model_path = os.path.join(model_dir, "demand_rf_model.joblib")
    demand_forecaster.save(model_path)
    print(f"Model saved to: {model_path}")

if __name__ == "__main__":
    train_and_export()
