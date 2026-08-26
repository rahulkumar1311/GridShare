"""
ML Training Pipeline for GridShare Short-Term Energy Demand Forecasting.
Trains a RandomForestRegressor baseline on synthetic multi-week diurnal data.
"""

import os
import sys
import json
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

# Add workspace root and gridshare to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gridshare.ml.data.dataset_generator import generate_telemetry_dataset
from gridshare.ml.features.feature_engineering import engineer_features, FEATURE_COLUMNS
from gridshare.ml.evaluate import evaluate_predictions, print_evaluation_report

def train_demand_model(days=60, n_estimators=100, max_depth=12, random_state=42):
    print("[Step 1/4] Generating 60-day simulated historical telemetry dataset...")
    raw_df = generate_telemetry_dataset(days=days, seed=random_state)
    print(f"   Generated {len(raw_df)} total hourly telemetry records across 5 households.")

    print("[Step 2/4] Engineering lag, rolling statistical & cyclical features...")
    featured_df, features = engineer_features(raw_df, is_training=True)
    print(f"   Engineered {len(features)} features: {features}")
    print(f"   Training dataset shape after lag alignment: {featured_df.shape}")

    X = featured_df[features]
    y = featured_df["target_consumption_kw"]

    # Temporal / random train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, shuffle=True
    )
    print(f"   Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    print("[Step 3/4] Training RandomForestRegressor baseline model...")
    model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    print("[Step 4/4] Evaluating model on holdout test partition...")
    y_pred = model.predict(X_test)
    metrics = evaluate_predictions(y_test, y_pred, dataset_size=len(raw_df))
    print_evaluation_report(metrics)

    # Save Model Artifacts
    model_dir = os.path.join(os.path.dirname(__file__), "model")
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "energy_demand_rf.joblib")
    meta_path = os.path.join(model_dir, "metadata.json")

    joblib.dump(model, model_path)
    with open(meta_path, "w") as f:
        json.dump({
            "model_file": "energy_demand_rf.joblib",
            "features": features,
            "metrics": metrics,
            "model_version": "random_forest_v1.0",
        }, f, indent=2)

    print(f"[SUCCESS] Model artifact saved to: {model_path}")
    print(f"[SUCCESS] Metadata saved to:       {meta_path}\n")
    return model, metrics

if __name__ == "__main__":
    train_demand_model()
