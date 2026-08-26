"""
Random Forest ML Model Pipeline for GridShare Load & Solar Forecasting.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

class EnergyForecaster:
    def __init__(self, n_estimators=100, random_state=42):
        self.model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=12,
            random_state=random_state,
            n_jobs=-1
        )
        self.is_trained = False

    def extract_features(self, df):
        """Extract cyclical and temporal features from time-series dataframe."""
        df = df.copy()
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df["hour"] = df["timestamp"].dt.hour
            df["dayofweek"] = df["timestamp"].dt.dayofweek
            df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)
        
        # Sine and Cosine cyclical hour encoding
        df["sin_hour"] = np.sin(2 * np.pi * df["hour"] / 24.0)
        df["cos_hour"] = np.cos(2 * np.pi * df["hour"] / 24.0)
        
        features = ["hour", "dayofweek", "is_weekend", "sin_hour", "cos_hour"]
        if "solar_capacity_kw" in df.columns:
            features.append("solar_capacity_kw")
        if "base_load_kw" in df.columns:
            features.append("base_load_kw")
            
        return df[features]

    def train(self, X_df, y_series):
        X = self.extract_features(X_df)
        X_train, X_test, y_train, y_test = train_test_split(X, y_series, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)
        self.is_trained = True
        
        preds = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        return {"mae": float(mae), "r2": float(r2), "sample_size": len(X)}

    def predict(self, X_df):
        if not self.is_trained:
            raise RuntimeError("Model must be trained before predicting.")
        X = self.extract_features(X_df)
        return self.model.predict(X)

    def save(self, filepath):
        joblib.dump(self.model, filepath)

    def load(self, filepath):
        self.model = joblib.load(filepath)
        self.is_trained = True
