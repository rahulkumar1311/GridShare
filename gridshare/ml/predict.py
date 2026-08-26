"""
ML Inference Engine for GridShare Energy Demand Forecasting.
Loads trained Random Forest model and performs short-term multi-step predictions.
Computes empirical ensemble tree standard deviation for authentic uncertainty quantification.
"""

import os
import sys
import math
from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
import joblib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gridshare.ml.features.feature_engineering import engineer_features, FEATURE_COLUMNS
from gridshare.ml.data.dataset_generator import HOUSEHOLD_METRICS

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "energy_demand_rf.joblib")

class DemandPredictor:
    def __init__(self, model_path=MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        if not os.path.exists(self.model_path):
            print("Trained model not found. Automatically triggering training...")
            from gridshare.ml.train import train_demand_model
            self.model, _ = train_demand_model()
        else:
            self.model = joblib.load(self.model_path)

    def predict_with_uncertainty(self, feature_df: pd.DataFrame) -> tuple[float, float]:
        """
        Calculates ensemble prediction and empirical standard deviation across all decision trees.
        Does NOT invent confidence percentages.
        """
        X = feature_df[FEATURE_COLUMNS]
        X_arr = X.values
        # Predict with individual trees to measure ensemble spread
        if hasattr(self.model, "estimators_") and len(self.model.estimators_) > 0:
            tree_preds = [tree.predict(X_arr)[0] for tree in self.model.estimators_]
            mean_pred = float(np.mean(tree_preds))
            std_err = float(np.std(tree_preds))
        else:
            mean_pred = float(self.model.predict(X_arr)[0])
            std_err = None

        return max(0.1, round(mean_pred, 4)), round(std_err, 4) if std_err is not None else None


    def predict_next_hours(self, household_id="house_a", recent_readings=None, horizon_hours=6) -> list[dict]:
        """
        Generate short-term forecast for the next N hours.
        """
        self._ensure_model_loaded()
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        prof = HOUSEHOLD_METRICS.get(household_id, HOUSEHOLD_METRICS["house_a"])
        solar_capacity = prof["solar_kw"]
        base_load = prof["base_load_kw"]

        # Extract lags from recent readings or initialize from base load
        if recent_readings and len(recent_readings) >= 3:
            lag1 = float(recent_readings[-1].get("consumption_kw", base_load))
            lag2 = float(recent_readings[-2].get("consumption_kw", base_load))
            lag3 = float(recent_readings[-3].get("consumption_kw", base_load))
        elif recent_readings and len(recent_readings) > 0:
            lag1 = float(recent_readings[-1].get("consumption_kw", base_load))
            lag2 = lag1
            lag3 = lag1
        else:
            lag1 = base_load * 1.1
            lag2 = base_load * 1.05
            lag3 = base_load * 0.95

        forecasts = []
        curr_lag1 = lag1
        curr_lag2 = lag2
        curr_lag3 = lag3

        for step in range(1, horizon_hours + 1):
            future_time = now + timedelta(hours=step)
            hour = future_time.hour
            day_of_week = future_time.weekday()
            is_weekend = 1 if day_of_week in (5, 6) else 0

            # Diurnal solar model
            if 6 <= hour <= 18:
                solar_factor = max(0.0, math.sin(math.pi * (hour - 6) / 12.0))
            else:
                solar_factor = 0.0

            pred_generation = round(solar_capacity * solar_factor * 0.92, 3)

            # Build single-step feature vector
            row = pd.DataFrame([{
                "timestamp": future_time.isoformat(),
                "household_id": household_id,
                "consumption_kw": curr_lag1,
                "generation_kw": pred_generation,
                "grid_price": 6.10,
            }])

            row_feat, _ = engineer_features(row, is_training=False)
            row_feat["lag_1h"] = curr_lag1
            row_feat["lag_2h"] = curr_lag2
            row_feat["lag_3h"] = curr_lag3
            row_feat["rolling_mean_3h"] = (curr_lag1 + curr_lag2 + curr_lag3) / 3.0
            row_feat["rolling_std_3h"] = float(np.std([curr_lag1, curr_lag2, curr_lag3]))

            # Fill any missing columns safely
            for col in FEATURE_COLUMNS:
                if col not in row_feat.columns:
                    row_feat[col] = 0.0

            pred_demand, tree_std = self.predict_with_uncertainty(row_feat)
            pred_net = round(pred_generation - pred_demand, 3)

            forecasts.append({
                "household_id": household_id,
                "prediction_time": future_time.isoformat(),
                "time_label": future_time.strftime("%H:%M UTC"),
                "horizon": f"{step}h_ahead",
                "horizon_hours": step,
                "predicted_demand_kw": round(pred_demand, 3),
                "predicted_generation_kw": pred_generation,
                "predicted_net_balance_kw": pred_net,
                "confidence": None,  # No fabricated confidence percentage
                "uncertainty_metric": "ensemble_tree_std_kw",
                "uncertainty_value": tree_std,
                "model_version": "random_forest_v1.0",
            })

            # Roll lags forward
            curr_lag3 = curr_lag2
            curr_lag2 = curr_lag1
            curr_lag1 = pred_demand

        return forecasts

if __name__ == "__main__":
    predictor = DemandPredictor()
    results = predictor.predict_next_hours("house_a", horizon_hours=6)
    print("[ML FORECAST] Generated 6-hour ML Forecast for House A:")
    for r in results:
        print(f" {r['time_label']} ({r['horizon']}): Demand={r['predicted_demand_kw']}kW (Uncertainty +/-{r['uncertainty_value']}kW) | Solar={r['predicted_generation_kw']}kW")
